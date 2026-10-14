<?php
/**
 * Renders the shortcode outside WordPress for testing, with minimal stand-ins
 * for the WordPress functions the plugin calls.
 *
 * Usage: php tests/render-page.php <plugin-dir> > page.html
 * The page loads the plugin's CSS and JS from "plugin/assets/", so serve it
 * from a folder where "plugin" points at <plugin-dir>.
 */

$plugin_dir = rtrim( $argv[1] ?? __DIR__ . '/../wedding-dress-size-calculator', '/' ) . '/';

define( 'ABSPATH', __DIR__ . '/' );
define( 'WDSC_TEST_SITE', 'https://weddingguestdresses.fashion' );

$GLOBALS['wdsc_test_enqueued'] = array();

function plugin_dir_path( $file ) { return dirname( $file ) . '/'; }
function plugin_dir_url( $file ) { return 'plugin/'; }
function add_action() {}
function add_shortcode() {}
function apply_filters( $name, $value ) { return $value; }
function home_url( $path = '' ) { return WDSC_TEST_SITE . $path; }
function get_permalink() { return WDSC_TEST_SITE . '/wedding-dress-size-calculator/'; }
function is_singular() { return true; }
function get_post() { return null; }
function has_shortcode() { return true; }
function get_post_meta() { return ''; }
function wp_register_style() {}
function wp_register_script() {}
function wp_enqueue_style( $h ) { $GLOBALS['wdsc_test_enqueued'][] = 'style:' . $h; }
function wp_enqueue_script( $h ) { $GLOBALS['wdsc_test_enqueued'][] = 'script:' . $h; }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_url( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES, 'UTF-8' ); }
function wp_strip_all_tags( $t ) { return strip_tags( $t ); }
function wp_json_encode( $data, $flags = 0 ) { return json_encode( $data, $flags ); }

require $plugin_dir . 'wedding-dress-size-calculator.php';

$body = wdsc_render();
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>Wedding Dress Size Calculator (test render)</title>
<style>
/* Rough stand-in for Hello Elementor's reset, so overrides get exercised. */
body { margin: 0; font-family: sans-serif; color: #333; background: #fff; }
button, [type="submit"], [type="button"] { color: #c36; border: 1px solid #c36; background: transparent; padding: .5rem 1rem; border-radius: 3px; }
button:hover, button:focus { color: #fff; background: #c36; }
table td, table th { border: 1px solid hsla(0,0%,50%,.5); padding: 15px; }
table tbody > tr:nth-child(odd) > td { background: hsla(0,0%,50%,.07); }
input[type="text"], select { border: 1px solid #666; border-radius: 3px; padding: .5rem 1rem; width: 100%; }
main { padding: 0 16px; }
</style>
<link rel="stylesheet" href="plugin/assets/calculator.css">
</head>
<body>
<main>
<h1>Wedding Dress Size Calculator</h1>
<?php echo $body; ?>
</main>
<script src="plugin/assets/calculator.js"></script>
</body>
</html>
