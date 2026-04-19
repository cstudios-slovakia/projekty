#!/bin/bash
for i in {1..20}; do
  if ./rebuild_proper_staging.exp; then
    echo "Deployment successful!"
    exit 0
  fi
  echo "Rate limit blocked, waiting 30 seconds..."
  sleep 30
done
echo "Failed to deploy after 20 attempts."
