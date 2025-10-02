# Railway Deployment Guide

## Quick Deploy

1. **Connect to Railway:**
   - Visit [railway.app](https://railway.app) and create an account
   - Connect your GitHub repository
   - Choose the backend folder as the root directory

2. **Set Environment Variables:**
   Add these environment variables in Railway dashboard:

   ```
   DATABASE_URL=postgresql://postgres:IsVXKeevkstNtmdqaULaXyCVjrgzRrkq@postgres.railway.internal:5432/railway
   ENVIRONMENT=production
   SECRET_KEY=your-super-secure-secret-key-for-production-change-this
   CORS_ORIGINS=https://your-frontend-domain.railway.app
   ```

   **Note:** Do NOT set the PORT variable manually - Railway sets this automatically.

3. **Deploy:**
   - Railway will automatically detect the Dockerfile
   - The `railway.json` file configures the build and start commands
   - The custom `start.sh` script properly handles Railway's PORT environment variable
   - Deployment should complete in a few minutes

## Port Configuration Fix

This deployment includes a fix for the common Railway PORT error:
- `start.sh` script properly handles the $PORT environment variable
- `start.py` provides a Python alternative with proper port handling
- Both scripts default to port 8000 if PORT is not set

## Database Configuration

Your PostgreSQL database is already configured with:
- **Host:** postgres.railway.internal
- **Port:** 5432
- **Database:** railway
- **User:** postgres
- **Password:** IsVXKeevkstNtmdqaULaXyCVjrgzRrkq

The backend will automatically:
- Connect to PostgreSQL using asyncpg
- Create database tables on startup
- Handle database migrations through Alembic

## API Endpoints

Once deployed, your API will be available at:
`https://your-service-name.railway.app`

### Available Endpoints:

- `GET /` - Health check
- `GET /health` - Detailed health check
- `GET /api/me` - Current user (requires auth)
- `GET /api/users/{user_id}` - Get user by ID (requires auth)
- `GET /api/contacts` - List contacts (requires auth)
- `POST /api/contacts` - Create contact (requires auth)
- `GET /api/campaigns` - List campaigns (requires auth)
- `POST /api/campaigns` - Create campaign (requires auth)
- `GET /api/messages` - List messages (requires auth)
- `POST /api/messages` - Send message (requires auth)

## Testing the API

Use the dashboard's "Teste API" section to verify all endpoints are working correctly after deployment.

## Security Notes

- Change the `SECRET_KEY` to a secure random string in production
- Configure `CORS_ORIGINS` to include only your frontend domains
- Firebase credentials are optional but recommended for production authentication

## Troubleshooting

1. **Port Issues (FIXED):**
   - The custom start scripts properly handle Railway's PORT variable
   - Railway automatically sets the PORT environment variable
   - Do not manually set PORT in environment variables

2. **Database Connection Issues:**
   - Verify the DATABASE_URL is exactly as provided
   - Check Railway logs for connection errors

3. **CORS Issues:**
   - Update CORS_ORIGINS to include your frontend domain
   - Ensure the frontend is making requests to the correct backend URL

## Logs and Monitoring

- View logs in Railway dashboard
- Monitor deployment status and resource usage
- Set up alerts for errors or downtime