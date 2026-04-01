<?php
// Inject LawyerDirectory into App.tsx and Layout.tsx

// === App.tsx ===
$appFile = '/opt/influenceurs-tracker/react-dashboard/src/App.tsx';
$app = file_get_contents($appFile);

if (!str_contains($app, 'LawyerDirectory')) {
    // Add import
    $app = str_replace(
        "import BusinessDirectory from './pages/content/BusinessDirectory';",
        "import BusinessDirectory from './pages/content/BusinessDirectory';\nimport LawyerDirectory from './pages/content/LawyerDirectory';",
        $app
    );

    // Add route
    $app = str_replace(
        '<Route path="content/businesses" element={<AdminRoute><BusinessDirectory /></AdminRoute>} />',
        '<Route path="content/businesses" element={<AdminRoute><BusinessDirectory /></AdminRoute>} />' . "\n" .
        '            <Route path="content/lawyers" element={<AdminRoute><LawyerDirectory /></AdminRoute>} />',
        $app
    );

    file_put_contents($appFile, $app);
    echo "App.tsx: LawyerDirectory added\n";
} else {
    echo "App.tsx: already has LawyerDirectory\n";
}

// === Layout.tsx ===
$layoutFile = '/opt/influenceurs-tracker/react-dashboard/src/components/Layout.tsx';
$layout = file_get_contents($layoutFile);

if (!str_contains($layout, 'content/lawyers')) {
    $layout = str_replace(
        '<NavLink to="/content/businesses" className={subNavClass} onClick={handleNavClick}>
                    Annuaire
                  </NavLink>',
        '<NavLink to="/content/businesses" className={subNavClass} onClick={handleNavClick}>
                    Annuaire
                  </NavLink>
                  <NavLink to="/content/lawyers" className={subNavClass} onClick={handleNavClick}>
                    Avocats
                  </NavLink>',
        $layout
    );

    file_put_contents($layoutFile, $layout);
    echo "Layout.tsx: Avocats nav link added\n";
} else {
    echo "Layout.tsx: already has Avocats link\n";
}
