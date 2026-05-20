# Backend Server Crash - Root Cause & Fix

## What's Happening 🚨

**The logs show:**
```
command finished with error [node server_dist/index.js]: signal: terminated
```

This means:
- ✅ Frontend is working correctly
- ✅ API requests are being made successfully
- ❌ **Backend server is crashing** when processing card detail requests
- ❌ Server restarts and tries again, but same thing happens

---

## Why It's Crashing 🤔

Likely causes (in order of probability):

### 1. **Memory Leak** (Most Common)
- Backend process is using too much memory
- Each card request allocates more memory
- Eventually server crashes
- Restart clears memory, repeats

**Fix:**
```bash
# Monitor memory usage while loading cards
# If memory keeps growing, there's a leak
```

### 2. **Database Query Too Heavy**
- Card detail endpoint is running expensive queries
- Query times out or exhausts resources
- Server crashes

**Fix:**
- Optimize database queries
- Add pagination/limits
- Cache expensive results

### 3. **Unhandled Error in Handler**
- Card detail endpoint has a bug
- Uncaught error crashes the process
- No error recovery

**Fix:**
- Add try-catch around card detail endpoint
- Log errors instead of crashing
- Return error response gracefully

### 4. **Missing Data Validation**
- Some cards have malformed data
- Code tries to process bad data
- Crashes

**Fix:**
- Validate data before processing
- Skip malformed cards gracefully

---

## How to Fix It

### Step 1: Check Backend Logs
Look at your backend server logs in detail. Look for:

```
// BAD:
Error: Cannot read property 'tcgplayer' of undefined
Error: Database connection timeout
Out of memory

// GOOD:
Card loaded successfully
Card fetched in 45ms
```

The error message will tell you exactly what's wrong.

### Step 2: Add Error Handling to Card Endpoint

In your backend, find the card detail endpoint (probably something like `/api/pokemon/cards/:id`) and wrap it:

```javascript
// BEFORE (crashes)
app.get('/api/pokemon/cards/:id', (req, res) => {
  const card = db.query('SELECT * FROM cards WHERE id = ?', req.params.id);
  const variants = db.query('SELECT * FROM variants WHERE card_id = ?', card.id);
  res.json({ data: { ...card, variants } });
});

// AFTER (graceful)
app.get('/api/pokemon/cards/:id', (req, res) => {
  try {
    const card = db.query('SELECT * FROM cards WHERE id = ?', req.params.id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // Optional: only fetch if needed
    const variants = db.query('SELECT * FROM variants WHERE card_id = ?', card.id);
    
    res.json({ 
      data: { 
        ...card, 
        variants: variants || [] 
      } 
    });
  } catch (error) {
    console.error('Card detail error:', error);
    res.status(500).json({ 
      error: 'Failed to load card',
      message: error.message 
    });
  }
});
```

### Step 3: Optimize Database Queries
If the problem is slow queries:

```javascript
// SLOW: Fetches everything
SELECT * FROM cards WHERE id = ?;

// FAST: Fetch only needed fields
SELECT id, name, number, images_large, images_small, 
       supertype, hp, rarity, artist, tcgplayer_prices 
FROM cards WHERE id = ?;
```

### Step 4: Add Caching
Reduce database hits by caching card data:

```javascript
const cache = new Map();

app.get('/api/pokemon/cards/:id', (req, res) => {
  const cached = cache.get(req.params.id);
  if (cached) {
    return res.json({ data: cached });
  }
  
  try {
    const card = db.query('SELECT * FROM cards WHERE id = ?', req.params.id);
    cache.set(req.params.id, card); // Cache for future requests
    res.json({ data: card });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 5: Full Data Resync
If the problem is corrupted data:

```bash
# On your backend server:

# 1. Stop the server
npm stop

# 2. Clear cache/temp
rm -rf node_modules/.cache
rm -rf ./temp/*

# 3. Clear database (if using in-memory or file-based)
# Or run a migration to validate data

# 4. Restart server
npm start

# 5. Trigger full sync (if you have sync endpoint)
# Usually something like: POST /api/admin/sync or /api/admin/resync
```

---

## Frontend Workaround (While Backend is Fixed)

I've created `card_detail_with_retry.tsx` which:
- ✅ **Auto-retries** up to 2 times if server crashes
- ✅ **Adds timeout** (10 seconds) so requests don't hang
- ✅ **Shows "Try Again" button** for manual retry
- ✅ **Logs errors** so you can see what's happening
- ✅ **Shows user-friendly error messages**

Replace `/card/[id].tsx` with this file. It won't fix the server crash, but it will:
- Give users a retry option
- Catch hung requests
- Auto-recover on transient failures

---

## Testing the Fix

### Before Fix:
```
Tap card → Loading... → CRASH after 5 seconds
(must restart app)
```

### After Fix (with retry):
```
Tap card → Loading... → CRASH → Auto-retry... → CRASH → Error screen with "Try Again" button
(user can tap button to retry, no app restart needed)
```

### After Full Backend Fix:
```
Tap card → Loading... → Card details load successfully ✅
(no errors)
```

---

## Diagnostic Commands

### Check if server is running:
```bash
curl https://pokemon-card-scan.replit.app/api/pokemon/sets
# Should return JSON with sets list
```

### Check if specific card endpoint works:
```bash
curl https://pokemon-card-scan.replit.app/api/pokemon/cards/base1-4
# Should return card data or error message (not crash)
```

### Monitor server memory:
```bash
# On server:
node --expose-gc app.js
# Then monitor memory while loading cards
```

---

## Summary

| Issue | Status | Solution |
|-------|--------|----------|
| Frontend code | ✅ Fixed | Use `card_detail_with_retry.tsx` |
| API responding | ✅ Working | No change needed |
| Backend crashing | 🔴 **ROOT CAUSE** | Add error handling, optimize queries, resync data |
| Auto-retry | ✅ Added | Frontend now retries failed requests |

**The real fix needs to happen on the backend.** The frontend can only work around the crashes, not prevent them.

Once the backend is fixed, the app will work perfectly.
