# Dev Server Troubleshooting Guide

## 🚀 Starting the Dev Server

### Standard Start Command
```bash
cd flyers-up
npm run dev
```

The server should start on **http://localhost:3000**

---

## ❌ Common Issues & Solutions

### 1. Port 3000 Already in Use

**Error**: `Port 3000 is already in use`

**Solution A**: Kill the process using port 3000
```powershell
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

**Solution B**: Use a different port
```bash
# Windows PowerShell
$env:PORT=3001; npm run dev

# Or create/edit .env.local file
echo PORT=3001 > .env.local
npm run dev
```

---

### 2. Dependencies Not Installed

**Error**: `Cannot find module` or `Module not found`

**Solution**: Install dependencies
```bash
cd flyers-up
npm install
```

---

### 3. Node.js Version Issues

**Error**: Build errors or compatibility issues

**Solution**: Check Node.js version
```bash
node --version
```

**Required**: Node.js 18.x or higher

**Install/Update Node.js**:
- Download from: https://nodejs.org/
- Or use nvm (Node Version Manager)

---

### 4. Build Errors

**Error**: TypeScript or compilation errors

**Solution A**: Check for linting errors
```bash
npm run lint
```

**Solution B**: Clear Next.js cache
```bash
# Delete .next folder
rm -rf .next

# Or on Windows PowerShell
Remove-Item -Recurse -Force .next

# Then restart dev server
npm run dev
```

---

### 5. Supabase Connection Issues

**Error**: Supabase connection errors in console

**Solution**: This is normal in UI-only mode. The app will use mock data.

**To use real Supabase**:
1. Create `.env.local` file in `flyers-up/` directory
2. Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### 6. Dev Server Not Starting

**Symptoms**: Command runs but no output, or server doesn't respond

**Solution A**: Check if Node.js is installed
```bash
node --version
npm --version
```

**Solution B**: Check for syntax errors in code
```bash
npm run build
```

**Solution C**: Check terminal output for specific errors
- Look for red error messages
- Check for missing files
- Verify all imports are correct

---

### 7. Localhost Link Not Opening

**Symptoms**: Server starts but browser can't connect

**Solution A**: Check firewall settings
- Windows Firewall might be blocking Node.js
- Allow Node.js through firewall

**Solution B**: Try accessing directly
- Open browser manually
- Go to: `http://localhost:3000`
- Or try: `http://127.0.0.1:3000`

**Solution C**: Check if server is actually running
```powershell
# Check if port 3000 is listening
netstat -ano | findstr :3000
```

---

### 8. Hot Reload Not Working

**Symptoms**: Changes to code don't reflect in browser

**Solution A**: Hard refresh browser
- `Ctrl + Shift + R` (Windows/Linux)
- `Cmd + Shift + R` (Mac)

**Solution B**: Restart dev server
- Stop server: `Ctrl + C`
- Start again: `npm run dev`

**Solution C**: Clear browser cache

---

## 🔍 Verification Steps

### 1. Check Dev Server is Running
```powershell
# Should show Node.js process
Get-Process -Name node

# Should show port 3000 listening
netstat -ano | findstr :3000
```

### 2. Check Browser Console
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### 3. Check Terminal Output
- Look for "Ready" message
- Should show: `- Local: http://localhost:3000`
- Check for any error messages in red

---

## 📋 Quick Checklist

Before reporting issues, verify:

- [ ] Node.js is installed (`node --version`)
- [ ] Dependencies are installed (`npm install`)
- [ ] No other process is using port 3000
- [ ] No syntax errors in code
- [ ] Terminal shows "Ready" message
- [ ] Browser can access `http://localhost:3000`
- [ ] No firewall blocking Node.js

---

## 🆘 Still Not Working?

### Get More Information

1. **Check full error output**:
   ```bash
   npm run dev 2>&1 | tee dev-output.log
   ```

2. **Check Next.js version**:
   ```bash
   npx next --version
   ```

3. **Try clean install**:
   ```bash
   # Remove node_modules and package-lock.json
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   
   # Reinstall
   npm install
   
   # Restart
   npm run dev
   ```

4. **Check for conflicting processes**:
   ```powershell
   # List all Node processes
   Get-Process -Name node
   
   # Kill all Node processes (use with caution)
   Get-Process -Name node | Stop-Process -Force
   ```

---

## 📞 Common Commands Reference

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Install dependencies
npm install

# Clear Next.js cache
Remove-Item -Recurse -Force .next
```

---

## 🌐 Alternative Ports

If port 3000 is unavailable, you can use:

- **3001**: `$env:PORT=3001; npm run dev`
- **3002**: `$env:PORT=3002; npm run dev`
- **8080**: `$env:PORT=8080; npm run dev`

Then access at: `http://localhost:3001` (or your chosen port)

---

## ✅ Expected Output When Server Starts

```
▲ Next.js 16.0.4
- Local:        http://localhost:3000
- Ready in 2.3s
```

If you see this, the server is running correctly!







