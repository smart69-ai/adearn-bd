# GitHub e Host korar Step-by-Step Guide

GitHub e website publish korte nicher steps gulo follow korun:

### Step 1: Export to GitHub
AI Studio er opore Daane (Right side) **Settings** e jaan, tarpor **Export to GitHub** e click kore ei project ti apnar GitHub account e niye jaan. Project er naam `Abc2.0` hobe.

### Step 2: GitHub Workflow File Create
Apnar GitHub repository te jaan (`Abc2.0`). 
1. Ekta folder banan `.github/workflows/` (Jodi na thake).
2. Oi folder er bhitor `deploy.yml` naame ekta file banan.
3. Nicher code tuku copy kore oi file e paste korun:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 3: Permissions Change (Khub Important)
Jodi "Actions" e error dekhay, tahole ei setting ti thik korun:
1. Apnar GitHub Repo er **Settings** tab e jaan.
2. Baam diker menu theke **Actions > General** e click korun.
3. Ekebare niche scroll kore **Workflow permissions** section e jaan.
4. **Read and write permissions** select korun ebong **Save** e click korun.

### Step 4: GitHub Pages Enable
1. Repo er **Settings > Pages** e jaan.
2. "Build and deployment" section e "Source" dropdown theke **GitHub Actions** select korun.

Tarpor apnar website ti `https://sonjitkumar051-tech.github.io/Abc2.0/` e live hoye jabe.

---

### Jodi kono somossa hoy (Troubleshooting):
- **Build Fail hole**: Settings e giye step 3 abar check korun checkbox gulo check kora kina.
- **Blank Page asle**: Ami `vite.config.ts` file e `base: '/Abc2.0/'` add kore diyechi, eta ekhon thik thakar kotha. 
- **Publish er por Change korle**: AI Studio te kaj korar por abar "Export to GitHub" korle GitHub e auto-update hoye jabe (workflow file ti thakle).
