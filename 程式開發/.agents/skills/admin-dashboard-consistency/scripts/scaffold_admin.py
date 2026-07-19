import sys
import shutil
import json
from pathlib import Path

# Path Configuration
SKILL_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = SKILL_ROOT / "templates"

def init_admin_dashboard(project_path):
    proj = Path(project_path).resolve()
    if not proj.exists():
        print(f"Error: Target project path {proj} does not exist!")
        sys.exit(1)

    print(f"Initializing Consistent Admin Dashboard in: {proj}")

    # 1. Ensure directories exist
    src_dir = proj / "src"
    pages_dir = src_dir / "pages"
    context_dir = src_dir / "context"
    pages_dir.mkdir(parents=True, exist_ok=True)
    context_dir.mkdir(parents=True, exist_ok=True)

    # 2. Copy components and context
    shutil.copy2(TEMPLATES_DIR / "AuthContext.jsx", context_dir / "AuthContext.jsx")
    shutil.copy2(TEMPLATES_DIR / "App.jsx", src_dir / "App.jsx")
    shutil.copy2(TEMPLATES_DIR / "AdminDashboard.jsx", pages_dir / "AdminDashboard.jsx")
    shutil.copy2(TEMPLATES_DIR / "ReporterForm.jsx", pages_dir / "ReporterForm.jsx")
    shutil.copy2(TEMPLATES_DIR / "HandoverConfirm.jsx", pages_dir / "HandoverConfirm.jsx")
    print("✓ Copied components and Context files (with route guard and whitelist checks).")

    # 3. Append RWD styles to index.css
    idx_css = src_dir / "index.css"
    if idx_css.exists():
        rwd_css_content = (TEMPLATES_DIR / "admin_rwd.css").read_text(encoding="utf-8")
        current_css = idx_css.read_text(encoding="utf-8")
        if "Responsive Design & Device Adjustments" not in current_css:
            with open(idx_css, "a", encoding="utf-8") as f:
                f.write("\n\n" + rwd_css_content)
            print("✓ Appended RWD Responsive CSS classes to src/index.css.")
        else:
            print("- RWD CSS classes already exist in src/index.css, skipping append.")
    else:
        # If no index.css, write a new one
        shutil.copy2(TEMPLATES_DIR / "admin_rwd.css", idx_css)
        print("✓ Created new src/index.css with RWD styles.")

    # 4. Update package.json to include admin npm commands
    pkg_json = proj / "package.json"
    if pkg_json.exists():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            if "scripts" not in data:
                data["scripts"] = {}
            
            data["scripts"]["admin:dev"] = "vite"
            data["scripts"]["admin:build"] = "vite build"
            data["scripts"]["admin:deploy"] = "npx firebase deploy --only hosting"
            
            pkg_json.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            print("✓ Updated package.json with admin commands (dev, build, deploy).")
        except Exception as e:
            print(f"Warning: Failed to update package.json: {e}")
    
    print("\n🎉 Success! Admin Dashboard scaffold with responsive design and whitelist guard generated successfully!")
    print("Next steps:")
    print("1. Set up Firestore collections: 'admins' and 'eq_settings'.")
    print("2. Run 'npm run build' and 'npm run admin:deploy' to test.")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    init_admin_dashboard(target)
