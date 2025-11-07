# Navigate to the mqtt-bridge directory
cd c:\Users\Administrator\Desktop\Capstone-Final-Final\mqtt-bridge

# Build the Docker image
gcloud builds submit --tag gcr.io/my-app-da530/mqtt-bridge:latest

# Deploy to Cloud Run with environment variables
gcloud run deploy mqtt-bridge --image gcr.io/my-app-da530/mqtt-bridge:latest --platform managed --region us-central1 --allow-unauthenticated --port 8080 --memory 1Gi --cpu 1 --min-instances 1 --max-instances 3 --set-env-vars "GCP_PROJECT_ID=my-app-da530,MQTT_BROKER_URL=mqtts://36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud:8883,MQTT_USERNAME=mqtt-bridge,MQTT_PASSWORD=Jaffmier@0924,LOG_LEVEL=info,NODE_ENV=production"