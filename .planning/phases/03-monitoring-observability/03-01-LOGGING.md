# Render Logging Documentation

## Backend Deployment

- **Backend URL:** https://sportsapiai.onrender.com
- **Service:** sportsai-backend
- **Platform:** Render (Node.js service)

## How to Access Logs

### Via Render Dashboard

1. Go to https://dashboard.render.com
2. Select the **sportsai-backend** service
3. Click the **Logs** tab
4. View real-time logs as they stream

### Log Types

Render provides several log types:

- **Request Logs:** HTTP requests to your service
- **Error Logs:** Application errors and exceptions
- **Build Logs:** Output from deployment builds
- **System Logs:** Render platform events

### Filtering Logs

In the Logs tab, you can filter by:

- **All** - Show all log levels
- **Errors** - Show only error-level logs
- **Warnings** - Show warning-level logs
- **Info** - Show informational logs

## Log Streaming

- **Real-time Streaming:** Logs appear in real-time as they're generated
- **Log Retention:** Free tier retains logs for 7 days
- **Download Logs:** Export logs for offline analysis

## Backend Logging Best Practices

### Current Implementation

The backend uses **NestJS with Fastify adapter**, which includes built-in logging:

- Fastify's logger is automatically configured
- Request/response logging is handled by the framework
- Structured JSON logs for easy parsing

### Custom Logging

For custom logging in your NestJS application:

```typescript
// Info logging
this.logger.log('User authenticated successfully');

// Warning logging
this.logger.warn('Rate limit approaching for API key');

// Error logging
this.logger.error('Database connection failed', error.stack);

// Debug logging (development only)
if (process.env.NODE_ENV === 'development') {
  this.logger.debug('API request details', { query, params });
}
```

### Important Events to Log

Always log these events for production monitoring:

1. **Authentication Events:**
   - User logins
   - Failed authentication attempts
   - Token refreshes

2. **API Calls:**
   - External API requests (Apify, sportsbooks)
   - API response times
   - Rate limit hits

3. **Errors:**
   - Unhandled exceptions
   - Database errors
   - Network failures

4. **Business Events:**
   - Arbitrage opportunities detected
   - User signups
   - Payment transactions

### Request ID Tracing

For distributed tracing, include request IDs:

```typescript
import { v4 as uuidv4 } from 'uuid';

// Middleware to add request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
});
```

## Log Analysis

### Common Patterns

**Successful Request:**
```
[info] GET /api/v1/health 200 45ms
```

**Error:**
```
[error] POST /api/v1/auth/login 401 23ms - Invalid credentials
```

**External API Call:**
```
[info] Fetching odds from Apify for event NFL_20240123
```

### Debugging Tips

1. **Search by Request ID:** Use `x-request-id` header to trace specific requests
2. **Filter by Time:** Use date range to isolate incidents
3. **Error Patterns:** Search for "error" or "exception" to find issues
4. **API Performance:** Look for slow requests (>1000ms)

## Monitoring Best Practices

### Daily Checks

1. Check error logs for unhandled exceptions
2. Review API response times for performance degradation
3. Verify external API integration success rates

### Weekly Reviews

1. Analyze traffic patterns and peak usage times
2. Review error rates and top error types
3. Check for any security-related events

### Alerting (Future Enhancement)

Consider setting up alerts for:

- Error rate > 5%
- Response time > 2000ms
- API failure rate > 10%
- Database connection failures

## Resources

- **Render Dashboard:** https://dashboard.render.com
- **Render Logging Docs:** https://render.com/docs/logs
- **NestJS Logging:** https://docs.nestjs.com/techniques/logger
- **Fastify Logger:** https://fastify.dev/docs/latest/Reference/Logger/
