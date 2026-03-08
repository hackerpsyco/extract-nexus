# 🚀 CLAS Production Deployment Guide

## Overview

This guide explains the permanent production solution for handling all 3 layers of caching in Django + WhiteNoise + Service Worker.

## The 3 Layers of Caching (Now Fixed)

### Layer 1: Static File Caching (WhiteNoise)
- **Problem**: Old CSS/JS files cached by browser
- **Solution**: `STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'`
- **How it works**: Django generates versioned filenames like `style.23f4a8.css`
- **Result**: Browser always downloads new files when they change

### Layer 2: Django Page Caching (Middleware)
- **Problem**: Django caches HTML pages for 600 seconds
- **Solution**: `CACHE_MIDDLEWARE_SECONDS = 0` in production
- **How it works**: Disables page-level caching, only caches API responses
- **Result**: Users always see latest HTML/templates

### Layer 3: Service Worker Caching (PWA)
- **Problem**: Service worker caches old pages indefinitely
- **Solution**: Increment `CACHE_NAMES` version numbers
- **How it works**: Service worker deletes all old caches on activation
- **Result**: PWA users get latest content on next visit

## Quick Deployment

### On Your Local Machine

```bash
# 1. Make changes to code/templates
# 2. Commit and push to GitHub
git add .
git commit -m "Fix: Step 3 conduct button now shows green after refresh"
git push origin stable-working

# 3. SSH into AWS
ssh -i your-key.pem ec2-user@your-aws-ip

# 4. Run deployment script
cd /path/to/CLAS
chmod +x deploy.sh
./deploy.sh
```

### What the deploy.sh Script Does

```bash
✓ Pulls latest code from GitHub
✓ Collects static files (generates versioned filenames)
✓ Clears Django cache
✓ Restarts Gunicorn (Django app server)
✓ Restarts Nginx (web server)
```

## Manual Deployment (If Script Fails)

```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@your-aws-ip

# Navigate to project
cd /path/to/CLAS

# Pull latest code
git pull origin stable-working

# Collect static files
python manage.py collectstatic --noinput --clear

# Clear Django cache
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
>>> exit()

# Restart services
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

## Verify Deployment

### Check Static Files Are Versioned

```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@your-aws-ip

# Check staticfiles directory
ls -la /path/to/CLAS/staticfiles/

# You should see files like:
# style.23f4a8.css
# main.9ab12.js
# (with hash suffixes)
```

### Check Service Worker Version

```bash
# In browser console (F12)
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => console.log(reg));
});
```

### Check Cache Headers

```bash
# In browser DevTools > Network tab
# Click on a static file and check Response Headers
# You should see:
# Cache-Control: public, max-age=31536000
```

## When to Update Cache Versions

### Update Service Worker Cache Version When:
- You change HTML templates
- You change CSS/JS files
- You want to force PWA users to refresh

**How to update:**
```javascript
// In static/service-worker.js
const CACHE_NAMES = {
  static: 'static-v3',  // ← Increment this
  pages: 'pages-v3',    // ← Increment this
  api: 'api-v3',        // ← Increment this
  offline: 'offline-v3' // ← Increment this
};
```

## Troubleshooting

### Users Still See Old UI After Deployment

**Step 1: Check if code was deployed**
```bash
# SSH into AWS
ssh -i your-key.pem ec2-user@your-aws-ip

# Check if file exists
cat /path/to/CLAS/Templates/facilitator/Today_session.html | grep "data-conduct-saved"

# Should show: {% if actual_session and is_today and session_status in "pending,conducted" %}
```

**Step 2: Check if static files were collected**
```bash
# Check staticfiles directory
ls -la /path/to/CLAS/staticfiles/ | grep -E "\.css|\.js"

# Should show versioned files like: style.23f4a8.css
```

**Step 3: Check if services restarted**
```bash
# Check Gunicorn status
sudo systemctl status gunicorn

# Check Nginx status
sudo systemctl status nginx

# Both should show "active (running)"
```

**Step 4: Ask users to hard refresh**
- Windows: `Ctrl+Shift+Delete` → Clear all → Refresh
- Mac: `Cmd+Shift+Delete` → Clear all → Refresh
- Or: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### Service Worker Not Updating

**Clear service worker cache:**
```javascript
// In browser console (F12)
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

// Then refresh page
location.reload();
```

## Production Checklist

- [ ] `CACHE_MIDDLEWARE_SECONDS = 0` in settings.py (production)
- [ ] `STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'`
- [ ] `deploy.sh` script created and executable
- [ ] Service worker cache versions incremented
- [ ] Code committed and pushed to GitHub
- [ ] `./deploy.sh` executed on AWS
- [ ] Static files collected (versioned filenames)
- [ ] Gunicorn and Nginx restarted
- [ ] Users can see latest UI changes

## Performance Impact

| Layer | Before | After | Impact |
|-------|--------|-------|--------|
| Static Files | Cached 1 year (old) | Versioned (always fresh) | ✅ Always latest |
| Django Pages | Cached 600s | No cache (0s) | ✅ Always latest |
| Service Worker | Cached indefinitely | Cleared on update | ✅ Always latest |

## Next Steps

1. **Commit this guide to Git**
   ```bash
   git add deploy.sh DEPLOYMENT_GUIDE.md
   git commit -m "Add production deployment automation"
   git push origin stable-working
   ```

2. **Test the deployment script**
   ```bash
   ./deploy.sh
   ```

3. **Verify changes appear**
   - Hard refresh browser: `Ctrl+F5`
   - Check browser console for service worker messages
   - Verify static files are versioned

4. **Document any issues**
   - If deployment fails, check logs:
     ```bash
     sudo journalctl -u gunicorn -n 50
     sudo journalctl -u nginx -n 50
     ```

## Support

If deployment still fails:
1. Check AWS CloudWatch logs
2. SSH into instance and check file permissions
3. Verify Git credentials are correct
4. Check disk space: `df -h`
5. Check memory: `free -h`

---

**Last Updated**: 2024
**Version**: 1.0
