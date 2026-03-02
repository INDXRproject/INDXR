#!/bin/bash

echo "Testing Anonymous Rate Limit (Should block after 10)"
echo "---------------------------------------------------"

for i in {1..12}
do
   response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/extract \
   -H "Content-Type: application/json" \
   -d '{"videoIdOrUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}')
   
   echo "Request $i: HTTP $response"
   
   if [ "$response" -eq 429 ]; then
     echo "!! Hit Rate Limit on Request $i !!"
     # Print the full body for the 429 response
     curl -s -X POST http://localhost:3000/api/extract \
       -H "Content-Type: application/json" \
       -d '{"videoIdOrUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
     echo ""
   fi
done
