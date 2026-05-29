"""
app/ontology/neo4j_client.py — Neo4j Graph Database Client (Synchronous)

Connects to the Neo4j cluster to query the curriculum dependency graph synchronously.
Ensures drop-in compatibility with the existing synchronous analytics and graph pipeline.
"""

from typing import Any, Dict, List, Optional
import structlog
from app.config import settings

logger = structlog.get_logger()

# Try loading neo4j driver
try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    logger.warning("neo4j python driver not installed. Neo4j features will be disabled.")


class Neo4jClient:
    """
    Synchronous connection client for the Neo4j Curriculum Dependency Graph.
    """

    def __init__(self):
        self.uri = getattr(settings, "NEO4J_URI", "bolt://localhost:7687")
        self.user = getattr(settings, "NEO4J_USER", "neo4j")
        self.password = getattr(settings, "NEO4J_PASSWORD", "password")
        self.driver = None

        if NEO4J_AVAILABLE:
            try:
                # Initialize connection pool
                self.driver = GraphDatabase.driver(
                    self.uri,
                    auth=(self.user, self.password),
                    max_connection_lifetime=30 * 60,  # 30 mins
                    max_connection_pool_size=50,
                )
                logger.info("Neo4j synchronous connection pool initialized", uri=self.uri)
            except Exception as e:
                logger.error("Failed to initialize Neo4j connection pool", error=str(e))

    def close(self) -> None:
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection pool closed")

    @property
    def is_healthy(self) -> bool:
        return NEO4J_AVAILABLE and self.driver is not None

    def find_downstream_impacts(
        self,
        weak_topic_id: str,
        max_depth: int = 4,
        min_strength: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Traverse the graph downstream from a weak topic to find future academic risks.
        """
        if not self.is_healthy:
            logger.warning("Neo4j client not active; skipping graph search")
            return []

        query = """
        MATCH path = (start:Topic {id: $weak_topic_id})-[:PREREQUISITE_FOR*1..$max_depth]->(future:Topic)
        WITH future, path, 
             reduce(acc = 1.0, r IN relationships(path) | acc * r.weight) AS cumulative_impact
        WHERE cumulative_impact >= $min_strength
        RETURN 
            future.id AS topic_id,
            future.name AS topic_name,
            future.grade AS grade,
            future.subject AS subject,
            round(cumulative_impact, 3) AS cumulative_impact,
            [n IN nodes(path) | n.name] AS path_steps
        ORDER BY cumulative_impact DESC
        """

        impacts = []
        try:
            with self.driver.session() as session:
                result = session.run(
                    query,
                    weak_topic_id=weak_topic_id,
                    max_depth=max_depth,
                    min_strength=min_strength
                )
                for record in result:
                    impacts.append({
                        "topic_id": record["topic_id"],
                        "topic_name": record["topic_name"],
                        "grade": record["grade"],
                        "subject": record["subject"],
                        "cumulative_impact": record["cumulative_impact"],
                        "path": record["path_steps"]
                    })
        except Exception as e:
            logger.error("Neo4j downstream impact query failed", error=str(e))
            
        return impacts

    def find_root_gaps(
        self,
        weak_topic_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Identify the root causes of a student's weak areas by looking for
        topics that have no weak prerequisites in the chain.
        """
        if not self.is_healthy or not weak_topic_ids:
            return []

        query = """
        MATCH (t:Topic)
        WHERE t.id IN $weak_topic_ids
        // Find if this weak topic has prerequisites that are also in the weak set
        OPTIONAL MATCH (prereq:Topic)-[:PREREQUISITE_FOR]->(t)
        WHERE prereq.id IN $weak_topic_ids
        WITH t, count(prereq) AS weak_prereq_count
        // A root gap is a weak topic with no weak predecessor blocking it
        WHERE weak_prereq_count = 0
        
        // Find downstream topics that are also weak
        OPTIONAL MATCH (t)-[:PREREQUISITE_FOR]->(downstream:Topic)
        WHERE downstream.id IN $weak_topic_ids
        
        RETURN 
            t.id AS topic_id,
            t.name AS topic_name,
            t.grade AS grade,
            t.subject AS subject,
            count(downstream) AS downstream_weak_count
        ORDER BY downstream_weak_count DESC
        """

        root_gaps = []
        try:
            with self.driver.session() as session:
                result = session.run(query, weak_topic_ids=weak_topic_ids)
                for record in result:
                    root_gaps.append({
                        "topic_id": record["topic_id"],
                        "topic_name": record["topic_name"],
                        "grade": record["grade"],
                        "subject": record["subject"],
                        "downstream_weak_count": record["downstream_weak_count"],
                        "is_true_root": record["downstream_weak_count"] > 0
                    })
        except Exception as e:
            logger.error("Neo4j root cause query failed", error=str(e))
            
        return root_gaps


# Global Singleton Client
_neo4j_client: Optional[Neo4jClient] = None

def get_neo4j_client() -> Neo4jClient:
    global _neo4j_client
    if _neo4j_client is None:
        _neo4j_client = Neo4jClient()
    return _neo4j_client
