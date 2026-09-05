"""
Load shapes for Locust — staged ramp to 1000 concurrent users.
"""
from __future__ import annotations

from locust import LoadTestShape


class ThousandUsersShape(LoadTestShape):
    """
    Answer: "1000 users ek saath backend hit karein to system kaisa perform karega?"

    Stages (total ~7 minutes):
      0–60s   → 100 users
      60–120s → 500 users
      120–180s → 1000 users (full concurrent load)
      180–420s → hold 1000 users (~4 min steady)
      420–480s → ramp down to 0
    """

    stages = [
        {"duration": 60, "users": 100, "spawn_rate": 20},
        {"duration": 120, "users": 500, "spawn_rate": 40},
        {"duration": 180, "users": 1000, "spawn_rate": 50},
        {"duration": 420, "users": 1000, "spawn_rate": 50},
        {"duration": 480, "users": 0, "spawn_rate": 100},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
