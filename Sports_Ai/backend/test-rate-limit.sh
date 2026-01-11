#!/bin/bash
# Test API rate limiting

echo "Testing API Rate Limiting..."
echo "Making rapid requests to trigger rate limit..."

# Counter for 429 responses
count429=0
successCount=0

# Make 15 rapid requests (limit is 10/second)
for i in {1..15}; do
  response=$(curl -s -w "\n%{http_code}" http://localhost:4000/v1/arbitrage/opportunities 2>/dev/null)
  http_code=$(echo "$response" | tail -1)

  if [ "$http_code" = "429" ]; then
    count429=$((count429 + 1))
    echo "Request $i: 429 Too Many Requests"
    # Check for Retry-After header
    headers=$(curl -s -I http://localhost:4000/v1/arbitrage/opportunities 2>/dev/null | grep -i "retry-after")
    if [ -n "$headers" ]; then
      echo "  Retry-After header found: $headers"
    fi
  else
    successCount=$((successCount + 1))
    echo "Request $i: HTTP $http_code"
  fi
done

echo ""
echo "Summary:"
echo "  Successful requests: $successCount"
echo "  Rate limited (429): $count429"

if [ "$count429" -gt 0 ]; then
  echo "  Rate limiting is WORKING!"
else
  echo "  WARNING: No rate limiting detected"
fi
