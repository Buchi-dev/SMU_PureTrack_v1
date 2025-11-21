Docker quick start

Build the application image:

```powershell
# build image
docker build -t server-app .
```

Run the full stack with docker compose (app + mongo + redis):

```powershell
# build and start services in background
docker compose up --build -d

# view logs
docker compose logs -f

# stop and remove
docker compose down
```

Notes:
- The compose file maps container port 3000 to host 3000. Change PORT environment in `docker-compose.yml` as needed.
- It sets MONGO_URI to "mongodb://mongo:27017/water_quality" and REDIS_URL to "redis://redis:6379"; if your app reads env vars from a .env file, provide one and map it into the service.
