#!/usr/bin/env bash
# =========================================================
# messiQ Server Runner Script
# Usage:
#   ./run-server.sh          (Runs with default out-of-the-box H2 MySQL mode)
#   ./run-server.sh --mysql  (Runs with external MySQL 8.0 database)
# =========================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PROFILE="default"
if [ "$1" == "--mysql" ]; then
    PROFILE="mysql"
    echo "Starting messiQ Server with MySQL profile..."
else
    echo "Starting messiQ Server with default profile (Embedded H2 MySQL mode)..."
fi

if [ ! -f "messiq-server/target/messiq-server-1.0.0.jar" ]; then
    echo "Building messiq-server JAR..."
    mvn clean package -pl messiq-server -DskipTests
fi

java -Dspring.profiles.active="$PROFILE" -jar messiq-server/target/messiq-server-1.0.0.jar
