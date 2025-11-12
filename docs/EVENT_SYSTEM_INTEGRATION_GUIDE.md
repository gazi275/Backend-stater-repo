# Event System Integration Guide

## 🎯 How to Use the New BullMQ Event System

This guide shows you **where and when** to trigger events in your controllers.

---

## 📋 Event Types Available

### 1. User Events (`addUserEventJob`)

| Event Type | When to Trigger | Example Use Case |
|-----------|----------------|------------------|
| `created` | After user registration | Send welcome email |
| `updated` | After profile update | Track important changes |
| `deleted` | After account deletion | Send confirmation |

### 2. Booking Events (`addBookingEventJob`)

| Event Type | When to Trigger | Example Use Case |
|-----------|----------------|------------------|
| `created` | After booking creation | Send booking confirmation |
| `updated` | After status change | Notify user of CONFIRMED/COMPLETED |
| `cancelled` | After cancellation | Send cancellation notice |

### 3. Payment Events (`addPaymentEventJob`)

| Event Type | When to Trigger | Example Use Case |
|-----------|----------------|------------------|
| `completed` | After successful payment | Send receipt + update booking |
| `failed` | After payment failure | Send retry notice |

---

## 🔌 Integration Examples

### User Controller

```typescript
// src/app/modules/user/user.controller.ts
import { addUserEventJob } from "../../utils/queue";

// ✅ On user registration
const signUp = catchAsync(async (req, res) => {
  const userData = req.body;
  
  // Create user
  const user = await userService.createUser(userData);
  
  // Trigger event: Send welcome email
  await addUserEventJob("created", {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
  
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User registered successfully",
    data: user
  });
});

// ✅ On profile update
const updateProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const updates = req.body;
  
  // Update user
  const user = await userService.updateUser(userId, updates);
  
  // Trigger event: Track changes (email/role change)
  if (updates.email || updates.role) {
    await addUserEventJob("updated", {
      userId: user.id,
      email: user.email,
      changes: updates
    });
  }
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: user
  });
});

// ✅ On account deletion
const deleteAccount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  // Get user data before deletion
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  // Delete user
  await userService.deleteUser(userId);
  
  // Trigger event: Send deletion confirmation
  await addUserEventJob("deleted", {
    userId: user.id,
    email: user.email
  });
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Account deleted successfully"
  });
});
```

---

### Booking Controller

```typescript
// Example: src/app/modules/booking/booking.controller.ts
import { addBookingEventJob } from "../../utils/queue";

// ✅ On booking creation
const createBooking = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const bookingData = req.body;
  
  // Create booking
  const booking = await bookingService.createBooking({
    ...bookingData,
    userId
  });
  
  // Trigger event: Send booking confirmation
  await addBookingEventJob("created", {
    bookingId: booking.id,
    userId: booking.userId,
    serviceId: booking.serviceId,
    date: booking.date
  });
  
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Booking created successfully",
    data: booking
  });
});

// ✅ On booking status update
const updateBookingStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Update booking
  const booking = await bookingService.updateBooking(id, { status });
  
  // Trigger event: Notify user of status change
  if (["CONFIRMED", "COMPLETED"].includes(status)) {
    await addBookingEventJob("updated", {
      bookingId: booking.id,
      userId: booking.userId,
      status: booking.status
    });
  }
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking updated successfully",
    data: booking
  });
});

// ✅ On booking cancellation
const cancelBooking = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  // Cancel booking
  const booking = await bookingService.cancelBooking(id);
  
  // Trigger event: Send cancellation notice
  await addBookingEventJob("cancelled", {
    bookingId: booking.id,
    userId: booking.userId,
    reason: reason || "No reason provided"
  });
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking cancelled successfully",
    data: booking
  });
});
```

---

### Payment Controller

```typescript
// Example: src/app/modules/payment/payment.controller.ts
import { addPaymentEventJob } from "../../utils/queue";

// ✅ After successful payment
const processPayment = catchAsync(async (req, res) => {
  const { amount, bookingId } = req.body;
  const userId = req.user.id;
  
  try {
    // Process payment with Stripe
    const payment = await paymentService.createPayment({
      amount,
      userId,
      bookingId
    });
    
    // Trigger event: Send receipt + update booking.isPaid
    await addPaymentEventJob("completed", {
      paymentId: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      bookingId: payment.bookingId
    });
    
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Payment successful",
      data: payment
    });
    
  } catch (error) {
    // Trigger event: Send failure notice
    await addPaymentEventJob("failed", {
      userId,
      amount,
      reason: error.message
    });
    
    throw new ApiError(400, "Payment failed");
  }
});
```

---

### Webhook Controller (Stripe)

```typescript
// src/app/modules/webhook/webhook.controller.ts
import { addPaymentEventJob } from "../../utils/queue";

// ✅ Handle Stripe webhook for successful payment
const handleStripeWebhook = catchAsync(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      
      // Trigger event: Send receipt
      await addPaymentEventJob("completed", {
        paymentId: paymentIntent.id,
        userId: paymentIntent.metadata.userId,
        amount: paymentIntent.amount / 100,
        bookingId: paymentIntent.metadata.bookingId
      });
      break;
      
    case "payment_intent.payment_failed":
      const failedIntent = event.data.object;
      
      // Trigger event: Send failure notice
      await addPaymentEventJob("failed", {
        userId: failedIntent.metadata.userId,
        amount: failedIntent.amount / 100,
        reason: failedIntent.last_payment_error?.message || "Payment declined"
      });
      break;
  }
  
  res.json({ received: true });
});
```

---

## ⚡ Quick Reference

### Import Statements

```typescript
// At the top of your controller files
import { addUserEventJob } from "../../utils/queue";
import { addBookingEventJob } from "../../utils/queue";
import { addPaymentEventJob } from "../../utils/queue";
```

### Function Signatures

```typescript
// User events
await addUserEventJob(eventType: "created" | "updated" | "deleted", eventData: object);

// Booking events
await addBookingEventJob(eventType: "created" | "updated" | "cancelled", eventData: object);

// Payment events
await addPaymentEventJob(eventType: "completed" | "failed", eventData: object);
```

---

## 📊 What Happens Behind the Scenes?

### user.created Event Flow
```
Controller → addUserEventJob("created", {...})
    ↓
Redis Queue (persistent)
    ↓
User Events Worker
    ↓
Send Welcome Email with:
    - Beautiful gradient header
    - Welcome message
    - Profile completion checklist
    - Support contact info
```

### booking.created Event Flow
```
Controller → addBookingEventJob("created", {...})
    ↓
Redis Queue (persistent)
    ↓
Booking Events Worker
    ↓
Fetch booking + service from Prisma
    ↓
Send Confirmation Email with:
    - Booking details table
    - Service info
    - Date/time
    - Amount
```

### payment.completed Event Flow
```
Controller → addPaymentEventJob("completed", {...})
    ↓
Redis Queue (persistent)
    ↓
Payment Events Worker
    ↓
Update booking.isPaid = true
    ↓
Send Receipt Email with:
    - Payment confirmation
    - Amount display
    - Transaction ID
    - Support info
```

---

## ✅ Best Practices

### 1. Always Use Try-Catch for Events (Optional)

Events shouldn't block main operations:

```typescript
// ✅ Good - main operation succeeds even if event fails
const user = await userService.createUser(data);

try {
  await addUserEventJob("created", {...});
} catch (error) {
  logger.error("Failed to trigger user.created event:", error);
  // Don't throw - user creation still succeeded
}

return res.json({ success: true, data: user });
```

### 2. Provide All Required Data

Make sure workers have everything they need:

```typescript
// ❌ Bad - missing email
await addUserEventJob("created", {
  userId: user.id
  // Missing: email, name, role
});

// ✅ Good - complete data
await addUserEventJob("created", {
  userId: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});
```

### 3. Trigger at the Right Time

```typescript
// ❌ Bad - before database operation
await addBookingEventJob("created", {...});
const booking = await createBooking();  // What if this fails?

// ✅ Good - after successful operation
const booking = await createBooking();
await addBookingEventJob("created", {...});
```

### 4. Use Descriptive Event Data

```typescript
// ❌ Bad - unclear
await addBookingEventJob("cancelled", {
  id: "123",
  user: "456"
});

// ✅ Good - clear property names
await addBookingEventJob("cancelled", {
  bookingId: "123",
  userId: "456",
  reason: "Customer request"
});
```

---

## 🧪 Testing Events

### Mock in Unit Tests

```typescript
jest.mock("../../utils/queue", () => ({
  addUserEventJob: jest.fn(),
}));

test("triggers welcome email on signup", async () => {
  await signUp(req, res);
  
  expect(addUserEventJob).toHaveBeenCalledWith("created", {
    userId: expect.any(String),
    email: "test@example.com",
    name: "Test User",
    role: "USER"
  });
});
```

### Check Redis in Integration Tests

```typescript
import { userEventsQueue } from "../../utils/queue";

test("adds job to queue", async () => {
  await createUser(data);
  
  const jobs = await userEventsQueue.getJobs(["waiting"]);
  expect(jobs).toHaveLength(1);
  expect(jobs[0].name).toBe("created");
});
```

---

## 🎨 Email Templates Preview

### Welcome Email (user.created)
- Gradient purple/pink header
- Personalized greeting
- Profile completion checklist
- Support contact

### Booking Confirmation (booking.created)
- Blue gradient header
- Booking details table
- Service information
- Payment status

### Payment Receipt (payment.completed)
- Green gradient header
- Transaction details
- Amount with currency
- Download receipt button

### Payment Failed (payment.failed)
- Red error box
- Failure reason
- Retry payment button
- Support contact

---

## 📈 Monitoring Jobs

Check queue status in Redis:

```bash
# Connect to Redis CLI
redis-cli

# Check waiting jobs
LLEN bull:user-events:wait

# Check failed jobs
LLEN bull:user-events:failed

# Get job details
HGETALL bull:user-events:123
```

Or install BullBoard dashboard (see migration guide).

---

## 🚨 Common Issues

### Issue 1: Event not triggering
**Check:**
- Is Redis running?
- Is worker imported in `server.ts`?
- Are you awaiting the function?

### Issue 2: Email not sending
**Check:**
- Email credentials in `.env`
- Worker logs for errors
- Failed jobs in Redis

### Issue 3: Worker not processing
**Check:**
- Worker file imported in `server.ts`
- No syntax errors in worker file
- Redis connection successful

---

## 🎯 Implementation Checklist

- [ ] Import event functions in controllers
- [ ] Trigger `user.created` on signup
- [ ] Trigger `user.updated` on profile changes
- [ ] Trigger `user.deleted` on account deletion
- [ ] Trigger `booking.created` on booking creation
- [ ] Trigger `booking.updated` on status changes
- [ ] Trigger `booking.cancelled` on cancellation
- [ ] Trigger `payment.completed` on successful payment
- [ ] Trigger `payment.failed` on payment failure
- [ ] Test each event type
- [ ] Monitor Redis queues
- [ ] Check email delivery
- [ ] Verify database updates (booking.isPaid)

---

**Ready to integrate! 🚀**

Follow the examples above to add event triggers in your controllers.
