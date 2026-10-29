#!/usr/bin/env bash
# =========================================================
# messiQ Desktop Client Runner Script (JavaFX 21)
# =========================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "Launching messiQ JavaFX Desktop Client..."

if [ ! -f "messiq-client/target/messiq-client-1.0.0.jar" ]; then
    echo "Building messiq-client JAR..."
    mvn clean package -pl messiq-client -DskipTests
fi

java -jar messiq-client/target/messiq-client-1.0.0.jar
