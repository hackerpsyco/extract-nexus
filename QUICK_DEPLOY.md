# ⚡ Quick Deploy Reference

## One-Line Deployment

```bash
# On AWS server
cd /path/to/CLAS && ./deploy.sh
```

## What Gets Fixed

✅ Static file caching (versioned filenames)
✅ Django page caching (disabled in production)
✅ Service worker caching (cleared on update)
✅ Gunicorn restarted
✅ Nginx restarted

## Verify It Worked

1. **Hard refresh browser**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. **Check static files are versioned**:
   ```bash
   ls -la /path/to/CLAS/staticfiles/ | grep -E "\.css|\.js"
   # Should show: style.23f4a8.css, main.9ab12.js (with hashes)
   ```
3. **Check services are running**:
   ```bash
   sudo systemctl status gunicorn
   sudo systemctl status nginx
   # Both should show "active (running)"
   ```

## If Users Still See Old UI

Ask them to:
1. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache: `Ctrl+Shift+Delete`
3. Close and reopen browser
4. Check browser console for service worker messages

## When to Update Service Worker Cache

Edit `static/service-worker.js`:
```javascript
const CACHE_NAMES = {
  static: 'static-v4',    // ← Increment version
  pages: 'pages-v4',      // ← Increment version
  api: 'api-v4',          // ← Increment version
  offline: 'offline-v4'   // ← Increment version
};
```

Then run: `./deploy.sh`

## Full Deployment Workflow

```bash
# 1. Make code changes locally
# 2. Commit and push
git add .
git commit -m "Your message"
git push origin stable-working

# 3. SSH into AWS
ssh -i your-key.pem ec2-user@your-aws-ip

# 4. Deploy
cd /path/to/CLAS
./deploy.sh

# 5. Verify
# Hard refresh browser and check for changes
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Users see old UI | Hard refresh: `Ctrl+F5` |
| Static files not updated | Check: `ls -la staticfiles/` (should have hashes) |
| Services not running | `sudo systemctl restart gunicorn nginx` |
| Deploy script fails | Run manually: See `DEPLOYMENT_GUIDE.md` |

## Files to Know

- `deploy.sh` - Automated deployment script
- `DEPLOYMENT_GUIDE.md` - Full deployment documentation
- `PRODUCTION_FIXES_SUMMARY.md` - What was fixed
- `CLAS/settings.py` - Cache configuration
- `static/service-worker.js` - Service worker cache versions

---

**That's it! No more cache issues.** 🎉
