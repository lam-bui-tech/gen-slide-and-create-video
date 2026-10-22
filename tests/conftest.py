"""
tests/conftest.py
Global pytest configuration ensuring TEST_MODE is active.
"""
import os

os.environ["TEST_MODE"] = "1"
