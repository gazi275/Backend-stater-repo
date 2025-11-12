# Migration Guide: EventEmitter → BullMQ

## 🎯 Overview

We've migrated from **in-memory EventEmitter** to **Redis-backed BullMQ** for better reliability, scalability, and fault tolerance.

## 📊 Why BullMQ?

### EventEmitter (Old ❌)
- ❌ Lost on server crash
- ❌ Single process only
- ❌ No retry mechanism
- ❌ Can't scale across servers
- ❌ No persistence
- ✅ Very fast (in-memory)

### BullMQ (New ✅)
- ✅ Persistent (Redis-backed)
- ✅ Auto retry on failure
- ✅ Multi-server support
- ✅ Job scheduling
- ✅ Priority queues
- ✅ Survives crashes
- ✅ Dashboard monitoring
- ⚠️  Slightly slower (network call)

---

## 🔄 What Changed?

### Old Approach (EventEmitter)

```typescript
// ❌ OLD WAY
import appEvents from "./utils/events";

// In controller
async function createUser(req, res) {
  const user = await prisma.user.create({...});
  
  // Emit event
  appEvents.emitEvent("user.created", {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
  
  return res.json({ success: true, data: user });
}
```

### New Approach (BullMQ)

```typescript
// ✅ NEW WAY
import { addUserEventJob } from "./utils/queue";

// In controller
async function createUser(req, res) {
  const user = await prisma.user.create({...});
  
  // Add job to queue
  await addUserEventJob("created", {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
  
  return res.json({ success: true, data: user });
}
```

---

## 📝 Migration Examples

### 1. User Events

#### Before (EventEmitter)
```typescript
// user.controller.ts
appEvents.emitEvent("user.created", { userId, email, name, role });
appEvents.emitEvent("user.updated", { userId, changes });
appEvents.emitEvent("user.deleted", { userId, email });
```

#### After (BullMQ)
```typescript
// user.controller.ts
import { addUserEventJob } from "../../utils/queue";

// On user creation
await addUserEventJob("created", {
  userId: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});

// On user update
await addUserEventJob("updated", {
  userId: user.id,
  email: user.email,
  changes: { name: "New Name" }
});

// On user deletion
await addUserEventJob("deleted", {
  userId: user.id,
  email: user.email
});
```

### 2. Booking Events

#### Before
```typescript
appEvents.emitEvent("booking.created", { bookingId, userId, serviceId, date });
appEvents.emitEvent("booking.updated", { bookingId, userId, status });
appEvents.emitEvent("booking.cancelled", { bookingId, userId, reason });
```

#### After
```typescript
import { addBookingEventJob } from "../../utils/queue";

// On booking creation
await addBookingEventJob("created", {
  bookingId: booking.id,
  userId: booking.userId,
  serviceId: booking.serviceId,
  date: booking.date
});

// On booking update
await addBookingEventJob("updated", {
  bookingId: booking.id,
  userId: booking.userId,
  status: "CONFIRMED"
});

// On booking cancellation
await addBookingEventJob("cancelled", {
  bookingId: booking.id,
  userId: booking.userId,
  reason: "Customer request"
});
```

### 3. Payment Events

#### Before
```typescript
appEvents.emitEvent("payment.completed", { paymentId, userId, amount, bookingId });
appEvents.emitEvent("payment.failed", { userId, amount, reason });
```

#### After
```typescript
import { addPaymentEventJob } from "../../utils/queue";

// On payment success
await addPaymentEventJob("completed", {
  paymentId: payment.id,
  userId: payment.userId,
  amount: payment.amount,
  bookingId: payment.bookingId
});

// On payment failure
await addPaymentEventJob("failed", {
  userId: user.id,
  amount: 100.00,
  reason: "Insufficient funds"
});
```

---

## 🚀 New Queue Functions

### Available Functions

```typescript
// User events
addUserEventJob(eventType, eventData)
// eventType: "created" | "updated" | "deleted"

// Booking events
addBookingEventJob(eventType, eventData)
// eventType: "created" | "updated" | "cancelled"

// Payment events
addPaymentEventJob(eventType, eventData)
// eventType: "completed" | "failed"

// Email & Notifications (unchanged)
addEmailJob(emailData, options)
addNotificationJob(notificationData, options)
```

---

## 🏗️ Architecture

### Old Architecture
```
Controller → EventEmitter → Listeners (in-memory)
                ↓
         Email/Notification
```

### New Architecture
```
Controller → BullMQ Queue (Redis) → Worker
                                      ↓
                              Email/Notification
```

---

## 📁 File Structure

### Old (Deprecated)
```
src/utils/events/
├── index.ts              # EventEmitter
├── loader.ts             # Load listeners
├── user.listeners.ts     # ❌ Deprecated
├── booking.listeners.ts  # ❌ Deprecated
├── payment.listeners.ts  # ❌ Deprecated
└── review.listeners.ts   # ❌ Deprecated
```

### New
```
src/utils/queue/
├── index.ts                          # Queue setup & helpers
└── workers/
    ├── email.worker.ts               # Email processing
    ├── notification.worker.ts        # Notification processing
    ├── user-events.worker.ts         # ✅ User events
    ├── booking-events.worker.ts      # ✅ Booking events
    └── payment-events.worker.ts      # ✅ Payment events
```

---

## ⚙️ Configuration

### Workers Auto-Start in server.ts

```typescript
// Workers are imported and auto-started
import "./utils/queue/workers/email.worker";
import "./utils/queue/workers/notification.worker";
import "./utils/queue/workers/user-events.worker";
import "./utils/queue/workers/booking-events.worker";
import "./utils/queue/workers/payment-events.worker";
```

### Graceful Shutdown

```typescript
// Queues properly close on shutdown
import { closeQueues } from "./utils/queue";

process.on("SIGTERM", async () => {
  await closeQueues();
  // ... other cleanup
});
```

---

## 🎨 Enhanced Features

### 1. Beautiful Email Templates

All event emails now have professional HTML templates:
- Welcome emails with gradients
- Booking confirmations with details table
- Payment receipts with amount display
- Cancellation notices

### 2. Auto-Retry

Failed jobs automatically retry with exponential backoff:
```typescript
{
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000  // 1s, 2s, 4s
  }
}
```

### 3. Concurrency Control

Workers process multiple jobs concurrently:
```typescript
{
  concurrency: 5,  // Process 5 jobs at once
  limiter: {
    max: 10,      // Max 10 jobs
    duration: 1000 // per second
  }
}
```

### 4. Priority Queues

Failed payments get higher priority:
```typescript
{
  priority: eventType === "failed" ? 2 : 1
}
```

---

## 📊 Monitoring

### BullBoard Dashboard (Optional)

Install BullBoard to monitor queues:

```bash
npm install @bull-board/api @bull-board/express
```

```typescript
// Add to app.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(notificationQueue),
    new BullMQAdapter(userEventsQueue),
    new BullMQAdapter(bookingEventsQueue),
    new BullMQAdapter(paymentEventsQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Access dashboard: `http://localhost:5000/admin/queues`

---

## 🔍 Benefits Achieved

### Reliability
✅ Jobs persist in Redis - survive server crashes
✅ Auto-retry on failure (3 attempts with backoff)
✅ Failed job tracking and debugging

### Scalability
✅ Multiple servers can process same queue
✅ Horizontal scaling ready
✅ Load balancing across workers

### Observability
✅ Job status tracking (waiting, active, completed, failed)
✅ Detailed logging per job
✅ Dashboard monitoring (optional)

### Performance
✅ Concurrent job processing (5 jobs at once)
✅ Rate limiting (10 jobs/second)
✅ Priority-based processing

---

## ⚠️ Important Notes

### Redis Required
BullMQ requires Redis. Make sure Redis is running:
```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Or use existing Redis config
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### Async Operations
Queue jobs are async - don't wait for completion in API response:
```typescript
// ✅ Good - fire and forget
await addUserEventJob("created", data);
return res.json({ success: true });

// ❌ Bad - don't wait for worker to process
const result = await addUserEventJob("created", data);
await waitForJobCompletion(result.id); // Don't do this!
```

### Error Handling
Workers handle errors internally with retry logic. Controllers don't need to catch queue errors:
```typescript
try {
  await addUserEventJob("created", data);
  // If this fails, user creation still succeeds
  // Email will retry automatically
} catch (error) {
  // Log but don't throw - don't block user creation
  logger.error("Failed to add user event job:", error);
}
```

---

## 🧪 Testing

The queue functions can be mocked in tests:

```typescript
jest.mock("../../utils/queue", () => ({
  addUserEventJob: jest.fn(),
  addBookingEventJob: jest.fn(),
  addPaymentEventJob: jest.fn(),
}));

test("creates user and triggers event", async () => {
  const user = await createUser(data);
  
  expect(addUserEventJob).toHaveBeenCalledWith("created", {
    userId: user.id,
    email: user.email,
    // ...
  });
});
```

---

## 📈 Performance Comparison

### EventEmitter (Old)
- Execution: **~1ms** (in-memory)
- Reliability: ❌ Lost on crash
- Scalability: ❌ Single process
- Retry: ❌ No retry

### BullMQ (New)
- Execution: **~10-20ms** (Redis + processing)
- Reliability: ✅ Persisted
- Scalability: ✅ Multi-server
- Retry: ✅ 3 attempts with backoff

**Trade-off:** Slightly slower but MUCH more reliable!

---

## 🎯 Conclusion

The migration from EventEmitter to BullMQ provides:

✅ **Production-ready** event processing
✅ **Fault tolerance** with auto-retry
✅ **Scalability** across multiple servers
✅ **Monitoring** capabilities
✅ **Better UX** with professional email templates

The slight performance overhead (~10-20ms) is worth the reliability and scalability gains!

---

## 📚 Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Bull Board](https://github.com/felixmosh/bull-board) - Queue monitoring dashboard

---

**Migration Complete! 🎉**

Old event listeners are deprecated. Use the new `add*EventJob()` functions instead.
