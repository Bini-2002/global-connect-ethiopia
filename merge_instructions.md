# Branch Merge Instructions

You now have a newly created `backend` folder containing all backend code on your current branch (`feat/folder-structure`). 
To get a unified branch (`test-develop`) that has both the `backend` folder and the `frontend` folder (from the `frontend` branch), follow these exact steps in your terminal:

### Step 1: Push your current changes
Push the restructuring we just made to your current branch so it's safe.
```bash
git push origin feat/folder-structure
```

### Step 2: Create and checkout the `test-develop` branch
Assuming you want to start this branch from `main` or `develop` (replace `develop` with your base branch if needed):
```bash
git checkout develop
git pull origin develop
git checkout -b test-develop
```

### Step 3: Merge the Backend
Merge your `feat/folder-structure` branch into your new `test-develop` branch.
```bash
git merge feat/folder-structure
```
*At this point, `test-develop` will have the `backend` folder containing all your FastAPI code.*

### Step 4: Merge the Frontend
Now, fetch the remote branches and merge the `frontend` branch. Since the frontend branch should have all its files inside a `frontend` folder, there should be few to no conflicts!
```bash
git fetch origin
git merge origin/frontend --allow-unrelated-histories
```
*(If the frontend branch only has files inside a `frontend/` directory, the merge will be clean!)*

### Step 5: Push the unified branch
Finally, push your new unified branch to GitHub to visualize it.
```bash
git push -u origin test-develop
```

Now you can go to GitHub and see `test-develop` with both `frontend` and `backend` directories cleanly separated side-by-side!
