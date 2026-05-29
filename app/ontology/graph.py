"""
app/ontology/graph.py — Educational Knowledge Dependency Graph

Built using NetworkX — the standard Python graph library.
This is the "brain" of the future impact prediction system.

Graph structure:
  Nodes: Topics (with metadata: grade, subject, mastery threshold)
  Edges: Dependencies (with weight=dependency_strength, grade_gap)

Key operations:
  1. find_downstream_impacts(topic_id)
     → What future topics does weakness here affect?
  
  2. find_prerequisite_gaps(student_weak_topics, all_dependencies)
     → What ROOT CAUSE topics are missing (causing cascading weaknesses)?
  
  3. compute_prerequisite_weakness_score(student_weak_topics, graph)
     → Single number: how bad are the prerequisite gaps?
     → Used as ML feature in XGBoost risk model

Why NetworkX?
  - Native graph algorithms (BFS, DFS, shortest path, centrality)
  - Can compute transitive dependencies in one call
  - Serializable to JSON for storage in PostgreSQL JSONB
"""

from typing import Any

import structlog

logger = structlog.get_logger()


class DependencyGraph:
    """
    Educational topic dependency graph.
    
    Loaded from database (TopicDependency records) at startup,
    cached in memory, refreshed when ontology is updated.
    """

    def __init__(self):
        try:
            import networkx as nx
            self._graph = nx.DiGraph()  # Directed: source → target
            self._nx = nx
        except ImportError:
            logger.warning("NetworkX not installed. Graph features disabled.")
            self._graph = None
            self._nx = None

    @property
    def is_available(self) -> bool:
        return self._graph is not None

    def load_from_dependencies(self, dependencies: list[dict]) -> None:
        """
        Build graph from TopicDependency records.
        
        dependencies format:
        [
          {
            "source_topic_id": "uuid",
            "target_topic_id": "uuid",
            "dependency_strength": 0.9,
            "grade_gap": 2,
            "is_cross_subject": True,
            "source_name": "Fractions",
            "target_name": "Algebra",
            "source_grade": "6",
            "target_grade": "8",
            "source_subject": "Mathematics",
            "target_subject": "Mathematics",
          },
          ...
        ]
        """
        if not self.is_available:
            return

        self._graph.clear()

        for dep in dependencies:
            source = dep["source_topic_id"]
            target = dep["target_topic_id"]

            # Add nodes with metadata
            if source not in self._graph:
                self._graph.add_node(source, **{
                    "name": dep.get("source_name", ""),
                    "grade": dep.get("source_grade", ""),
                    "subject": dep.get("source_subject", ""),
                })
            if target not in self._graph:
                self._graph.add_node(target, **{
                    "name": dep.get("target_name", ""),
                    "grade": dep.get("target_grade", ""),
                    "subject": dep.get("target_subject", ""),
                })

            # Add directed edge with dependency properties
            self._graph.add_edge(
                source, target,
                weight=dep.get("dependency_strength", 0.5),
                grade_gap=dep.get("grade_gap", 0),
                is_cross_subject=dep.get("is_cross_subject", False),
            )

        logger.info(
            "Dependency graph loaded",
            nodes=self._graph.number_of_nodes(),
            edges=self._graph.number_of_edges(),
        )

    def find_downstream_impacts(
        self,
        topic_id: str,
        max_depth: int = 4,
        min_strength: float = 0.3,
    ) -> list[dict[str, Any]]:
        """
        BFS from a weak topic to find ALL future topics it will impact.
        Utilizes Neo4j graph DB if healthy, falling back to NetworkX.
        """
        from app.ontology.neo4j_client import get_neo4j_client
        neo4j = get_neo4j_client()
        if neo4j.is_healthy:
            return neo4j.find_downstream_impacts(topic_id, max_depth, min_strength)

        if not self.is_available or topic_id not in self._graph:
            return []

        impacts = []

        # BFS with depth limit
        queue = [(topic_id, 1.0, 0, [topic_id])]  # (node, impact_so_far, depth, path)
        visited = {topic_id}

        while queue:
            current, cumulative_impact, depth, path = queue.pop(0)

            if depth >= max_depth:
                continue

            for successor in self._graph.successors(current):
                if successor in visited:
                    continue

                edge_data = self._graph.edges[current, successor]
                strength = edge_data.get("weight", 0.5)
                grade_gap = edge_data.get("grade_gap", 0)
                cross_subject = edge_data.get("is_cross_subject", False)

                new_impact = cumulative_impact * strength

                if new_impact < min_strength:
                    continue  # Too weak to matter

                visited.add(successor)
                node_data = self._graph.nodes[successor]
                new_path = path + [node_data.get("name", successor)]

                impacts.append({
                    "topic_id": successor,
                    "topic_name": node_data.get("name", ""),
                    "grade": node_data.get("grade", ""),
                    "subject": node_data.get("subject", ""),
                    "cumulative_impact": round(new_impact, 3),
                    "grade_gap": grade_gap,
                    "is_cross_subject": cross_subject,
                    "path": new_path,
                })

                queue.append((successor, new_impact, depth + 1, new_path))

        # Sort by impact severity
        impacts.sort(key=lambda x: -x["cumulative_impact"])
        return impacts

    def find_root_gaps(
        self,
        weak_topic_ids: list[str],
    ) -> list[dict[str, Any]]:
        """
        Given a student's weak topics, trace BACK through dependencies
        to find the ROOT CAUSE topics.
        Utilizes Neo4j graph DB if healthy, falling back to NetworkX.
        """
        from app.ontology.neo4j_client import get_neo4j_client
        neo4j = get_neo4j_client()
        if neo4j.is_healthy:
            return neo4j.find_root_gaps(weak_topic_ids)

        if not self.is_available:
            return []

        weak_set = set(weak_topic_ids)
        root_gaps = []

        for topic_id in weak_topic_ids:
            if topic_id not in self._graph:
                continue

            predecessors = list(self._graph.predecessors(topic_id))

            # Check if all predecessors are NOT weak (this is a root gap)
            has_weak_predecessor = any(p in weak_set for p in predecessors)

            if not has_weak_predecessor:
                node_data = self._graph.nodes.get(topic_id, {})
                # Count how many other weak topics depend on this root gap
                downstream_weak = [
                    t for t in self._graph.successors(topic_id)
                    if t in weak_set
                ]
                root_gaps.append({
                    "topic_id": topic_id,
                    "topic_name": node_data.get("name", ""),
                    "grade": node_data.get("grade", ""),
                    "subject": node_data.get("subject", ""),
                    "downstream_weak_count": len(downstream_weak),
                    "is_true_root": len(predecessors) == 0,
                })

        # Sort: topics with most downstream impact first
        root_gaps.sort(key=lambda x: -x["downstream_weak_count"])
        return root_gaps

    def compute_prerequisite_weakness_score(
        self, weak_topic_ids: list[str]
    ) -> float:
        """
        Single composite score (0.0–1.0) representing how severe the
        prerequisite gaps are. Used as ML feature in XGBoost.
        
        High score = many critical prerequisite dependencies are weak.
        """
        if not self.is_available or not weak_topic_ids:
            return 0.0

        weak_set = set(weak_topic_ids)
        total_prerequisite_impact = 0.0
        count = 0

        for topic_id in weak_set:
            if topic_id not in self._graph:
                continue
            for successor in self._graph.successors(topic_id):
                edge = self._graph.edges[topic_id, successor]
                strength = edge.get("weight", 0.0)
                total_prerequisite_impact += strength
                count += 1

        if count == 0:
            return 0.0

        # Normalize: 0 = no downstream impact, 1 = many strong downstream deps
        raw_score = total_prerequisite_impact / max(count, 1)
        return min(1.0, round(raw_score, 4))

    def to_json(self) -> dict:
        """Serialize graph to JSON for PostgreSQL JSONB storage."""
        if not self.is_available:
            return {"nodes": [], "edges": []}

        nx = self._nx
        return {
            "nodes": [
                {"id": n, **self._graph.nodes[n]}
                for n in self._graph.nodes
            ],
            "edges": [
                {
                    "source": u,
                    "target": v,
                    **self._graph.edges[u, v],
                }
                for u, v in self._graph.edges
            ],
        }

    @classmethod
    def from_json(cls, data: dict) -> "DependencyGraph":
        """Reconstruct graph from stored JSON."""
        graph = cls()
        if not graph.is_available:
            return graph

        for node in data.get("nodes", []):
            node_id = node.pop("id")
            graph._graph.add_node(node_id, **node)

        for edge in data.get("edges", []):
            source = edge.pop("source")
            target = edge.pop("target")
            graph._graph.add_edge(source, target, **edge)

        return graph


# Module-level singleton — loaded once, shared across all requests
_global_graph: DependencyGraph | None = None


async def get_dependency_graph(db=None) -> DependencyGraph:
    """
    Return the global dependency graph.
    If not loaded yet, load from database.
    """
    global _global_graph
    if _global_graph is not None:
        return _global_graph

    _global_graph = DependencyGraph()

    if db is not None:
        try:
            from sqlalchemy import select
            from app.models.topic_dependency import TopicDependency
            from app.models.subject import Topic

            result = await db.execute(
                select(
                    TopicDependency,
                    Topic.name.label("source_name"),
                ).join(
                    Topic, TopicDependency.source_topic_id == Topic.id
                ).limit(5000)
            )
            deps = [row._asdict() for row in result.all()]
            _global_graph.load_from_dependencies(deps)
        except Exception as e:
            logger.warning("Failed to load dependency graph from DB", error=str(e))

    return _global_graph


def invalidate_graph_cache() -> None:
    """Force reload on next request (call after ontology updates)."""
    global _global_graph
    _global_graph = None
