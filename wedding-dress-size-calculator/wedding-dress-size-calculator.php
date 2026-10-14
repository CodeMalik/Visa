<?php
/**
 * Plugin Name:       Wedding Dress Size Calculator
 * Description:       Bridal size calculator built on brands' own published size charts. Add the shortcode [wedding_dress_size_calculator] to a page with Elementor's Shortcode widget. Runs in the browser; no measurement is stored or sent.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            weddingguestdresses.fashion
 * License:           GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WDSC_VERSION', '1.0.0' );
define( 'WDSC_SHORTCODE', 'wedding_dress_size_calculator' );
define( 'WDSC_DIR', plugin_dir_path( __FILE__ ) );
define( 'WDSC_URL', plugin_dir_url( __FILE__ ) );

/**
 * Brands' own chart pages, used only when data/brands.json cannot be read.
 * tests/plugin.test.js checks these still match the data file.
 */
function wdsc_fallback_charts() {
	return array(
		array( 'name' => 'Azazie', 'url' => 'https://www.azazie.com/size-chart' ),
		array( 'name' => 'Maggie Sottero', 'url' => 'https://ms-api.maggiesottero.com/product/Content/Files/2338/Sizing%20and%20Special%20Lengths%20F21.pdf' ),
		array( 'name' => 'Allure Bridals', 'url' => 'https://allurebridals.com/pages/size-guide' ),
	);
}

/**
 * Internal links. Slugs confirmed by the site owner.
 */
function wdsc_links() {
	$slugs = array(
		'alterations'  => 'wedding-dress-alterations-cost-guide',
		'plusSize'     => 'plus-size-wedding-dresses-that-flatter',
		'secondhand'   => 'secondhand-wedding-dress-buying-guide',
		'underwear'    => 'what-to-wear-under-wedding-dress',
		'fittings'     => 'how-many-wedding-dress-fittings-do-you-need',
		'timeline'     => 'wedding-dress-shopping-timeline-checklist',
		'comparison'   => 'davids-bridal-vs-azazie-comparison',
		'affordable'   => 'affordable-wedding-dresses-under-500',
		'modest'       => 'modest-wedding-dresses-with-sleeves',
		'rentOrBuy'    => 'rent-wedding-dress-vs-buying-real-cost',
	);
	$links = array();
	foreach ( $slugs as $key => $slug ) {
		$links[ $key ] = home_url( '/' . $slug . '/' );
	}
	return $links;
}

/**
 * Reads data/brands.json. Returns array( 'raw' => string, 'data' => array ),
 * or null if the file is missing or not valid chart data. The raw text is
 * what goes to the browser, so numbers reach the page exactly as stored.
 */
function wdsc_load_data() {
	static $loaded = false;
	static $result = null;
	if ( $loaded ) {
		return $result;
	}
	$loaded = true;

	$path = WDSC_DIR . 'data/brands.json';
	if ( ! is_readable( $path ) ) {
		return null;
	}
	$raw  = file_get_contents( $path );
	$data = json_decode( $raw, true );
	if ( ! is_array( $data ) || empty( $data['brands'] ) || ! is_array( $data['brands'] ) ) {
		return null;
	}
	$result = array(
		'raw'  => $raw,
		'data' => $data,
	);
	return $result;
}

/* -------------------------------------------------------------------------
 * Calculation used for the worked example in the page copy. Mirrors
 * assets/calculator.js; tests/plugin.test.js checks both agree.
 * ---------------------------------------------------------------------- */

function wdsc_convert( $value, $from, $to ) {
	if ( $from === $to ) {
		return $value;
	}
	$out = 'in' === $from ? $value * 2.54 : $value / 2.54;
	return round( $out, 3 );
}

function wdsc_size_index( $brand, $field, $value ) {
	foreach ( $brand['sizes'] as $i => $row ) {
		if ( $row[ $field ] >= $value ) {
			return $i;
		}
	}
	return -1;
}

/**
 * @param array $brand   One entry of brands.json "brands".
 * @param array $body_in array( 'bust' => , 'waist' => , 'hips' => ) in inches.
 * @return array|null Null when a measurement is beyond the chart.
 */
function wdsc_calculate( $brand, $body_in ) {
	$index = array();
	foreach ( array( 'bust', 'waist', 'hips' ) as $field ) {
		$index[ $field ] = wdsc_size_index( $brand, $field, wdsc_convert( $body_in[ $field ], 'in', $brand['units'] ) );
		if ( -1 === $index[ $field ] ) {
			return null;
		}
	}
	$recommended = max( $index );
	$size_for    = array();
	foreach ( $index as $field => $i ) {
		$size_for[ $field ] = $brand['sizes'][ $i ]['size'];
	}
	return array(
		'size_for'    => $size_for,
		'recommended' => $brand['sizes'][ $recommended ]['size'],
		'straddle'    => count( array_unique( $index ) ),
		'deciding'    => array_keys( $index, $recommended, true ),
	);
}

/* -------------------------------------------------------------------------
 * Formatting helpers
 * ---------------------------------------------------------------------- */

function wdsc_num( $value ) {
	return rtrim( rtrim( number_format( (float) $value, 2, '.', '' ), '0' ), '.' );
}

function wdsc_date( $iso ) {
	$date = DateTime::createFromFormat( 'Y-m-d', $iso );
	return $date ? $date->format( 'j M Y' ) : $iso;
}

function wdsc_unit_name( $unit ) {
	return 'in' === $unit ? 'inches' : 'centimetres';
}

/**
 * Values published at an unusual precision for their unit (an inch chart on
 * halves, a cm chart on whole numbers). Same rule as tools/validate_brands.py.
 * Shown on the page as "possibly a typo at the source"; never corrected.
 */
function wdsc_unusual_values( $brand ) {
	$found = array();
	foreach ( $brand['sizes'] as $row ) {
		foreach ( array( 'bust', 'waist', 'hips' ) as $field ) {
			$v     = (float) $row[ $field ];
			$steps = 'in' === $brand['units'] ? $v * 2 : $v;
			if ( abs( $steps - round( $steps ) ) > 1e-9 ) {
				$found[] = array( 'size' => $row['size'], 'field' => $field, 'value' => $v );
			}
		}
	}
	return $found;
}

function wdsc_external_link( $url, $text ) {
	return '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener">' . esc_html( $text ) .
		'<span class="wdsc-sr"> (opens in a new tab)</span></a>';
}

/* -------------------------------------------------------------------------
 * Measurement diagram: a dress form with the tape line for one measurement.
 * Line art only, no human figure.
 * ---------------------------------------------------------------------- */

function wdsc_diagram( $field ) {
	$lines = array(
		'bust'  => array( 'y' => 52, 'x1' => 16, 'x2' => 104 ),
		'waist' => array( 'y' => 80, 'x1' => 30, 'x2' => 90 ),
		'hips'  => array( 'y' => 108, 'x1' => 16, 'x2' => 104 ),
	);
	$labels = array(
		'bust'  => 'tape level around the fullest part of the bust',
		'waist' => 'tape around the narrowest part of the torso',
		'hips'  => 'tape level around the fullest part of the hips and seat',
	);
	$svg  = '<svg class="wdsc-diagram" viewBox="0 0 160 150" role="img" aria-label="Dress form diagram: ' . esc_attr( $labels[ $field ] ) . '" focusable="false">';
	$svg .= '<path class="wdsc-form-outline" d="M54 6H66V16C80 18 92 20 96 26C99 32 95 38 94 40C97 46 98 52 97 56C95 66 88 74 84 80C92 90 98 100 98 108C98 114 96 118 94 122H26C24 118 22 114 22 108C22 100 28 90 36 80C32 74 25 66 23 56C22 52 23 46 26 40C25 38 21 32 24 26C28 20 40 18 54 16Z"/>';
	$svg .= '<path class="wdsc-form-outline" d="M60 122V142M46 142H74"/>';
	foreach ( $lines as $name => $l ) {
		$class = $name === $field ? 'wdsc-tape wdsc-tape-active' : 'wdsc-tape';
		$svg  .= '<line class="' . $class . '" x1="' . $l['x1'] . '" y1="' . $l['y'] . '" x2="' . $l['x2'] . '" y2="' . $l['y'] . '"/>';
	}
	$active = $lines[ $field ];
	$svg   .= '<text class="wdsc-diagram-label" x="110" y="' . ( $active['y'] + 4 ) . '">' . esc_html( ucfirst( $field ) ) . '</text>';
	$svg   .= '</svg>';
	return $svg;
}

/* -------------------------------------------------------------------------
 * FAQ: one source for the visible FAQ and the FAQPage JSON-LD.
 * ---------------------------------------------------------------------- */

function wdsc_faqs( $data, $links ) {
	$knot = '<a href="https://www.theknot.com/content/wedding-dress-sizes" target="_blank" rel="noopener">The Knot<span class="wdsc-sr"> (opens in a new tab)</span></a>';

	$custom_names = array();
	if ( $data ) {
		foreach ( $data['brands'] as $brand ) {
			if ( ! empty( $brand['custom_sizing_available'] ) ) {
				$custom_names[] = $brand['brand_name'];
			}
		}
	}
	$custom_sentence = $custom_names ?
		' Of the designers in this calculator, ' . esc_html( implode( ', ', $custom_names ) ) .
		( 1 === count( $custom_names ) ? ' offers' : ' offer' ) . ' custom sizing.' : '';

	return array(
		array(
			'q' => 'Is bridal sizing different from normal clothing sizing?',
			'a' => 'Yes. Bridal sizing runs roughly three sizes larger than everyday clothing sizing, according to ' . $knot . ', because it grew out of an older European sizing system that was never brought into line with modern clothing labels. Each designer also publishes its own chart. A higher bridal number than usual describes how that designer cuts its gowns, not anything about you.',
		),
		array(
			'q' => 'What size should I order if my measurements fall in different sizes?',
			'a' => 'Order the size that matches your largest measurement, then have the dress taken in where it is loose. The calculator does this for you and shows which measurement sets the size. Some designers add style-specific advice; Maggie Sottero, for example, notes that for ballgowns the smaller size may be ordered if only the hip matches the larger one. Follow the advice of the designer you are ordering from.',
		),
		array(
			'q' => 'Can a wedding dress be made bigger?',
			'a' => 'Only a little. ' . $knot . ' notes that a gown can typically be let out by only about one size, because it depends on how much spare fabric is left in the seams, and some styles have very little. If you are relying on letting a dress out, ask a seamstress to look at that specific style before you order.',
		),
		array(
			'q' => 'How much can a wedding dress be taken in?',
			'a' => 'About two sizes is typical, according to ' . $knot . '. More is sometimes possible, but it becomes a larger job that can mean reworking seams, lining and detailing, and the cost rises with it. Our <a href="' . esc_url( $links['alterations'] ) . '">alterations cost guide</a> covers what to expect.',
		),
		array(
			'q' => 'Should I order a smaller size than my measurements show?',
			'a' => 'No. Order the size that fits your measurements as they are today. Taking a dress in is routine, letting it out is limited to about one size, and a dress ordered too small may not be fixable. Final fittings happen close to the wedding, so the dress is adjusted to fit you then. See <a href="' . esc_url( $links['fittings'] ) . '">how many fittings you need</a>.',
		),
		array(
			'q' => 'Why does the calculator give a different size for each brand?',
			'a' => 'Because there is no industry-standard bridal size. Every designer publishes its own chart, so the same three measurements can match a different size at each one. Always use the chart of the designer you are actually ordering from.',
		),
		array(
			'q' => 'What if my measurements are larger than a brand\'s size chart?',
			'a' => 'Then that chart has reached its end, which is a limit of the chart, not a statement about you. The calculator shows which other charts in it extend to your measurements.' . $custom_sentence . ' A dressmaker can also make a gown to your measurements. Our <a href="' . esc_url( $links['plusSize'] ) . '">plus-size wedding dress guide</a> covers designers and fit in more depth.',
		),
		array(
			'q' => 'Is anything I enter saved or sent anywhere?',
			'a' => 'No. The calculation runs entirely in your browser and your measurements are never stored or sent. The page remembers only your choice of units and the last brand you picked, on this device, so you do not have to choose them again.',
		),
	);
}

/* -------------------------------------------------------------------------
 * JSON-LD
 * ---------------------------------------------------------------------- */

function wdsc_rank_math_breadcrumbs_on() {
	if ( is_callable( array( 'RankMath\\Helper', 'get_settings' ) ) ) {
		return (bool) call_user_func( array( 'RankMath\\Helper', 'get_settings' ), 'general.breadcrumbs' );
	}
	return false;
}

function wdsc_schema( $faqs, $page_url ) {
	$graphs = array();

	$graphs[] = array(
		'@context'            => 'https://schema.org',
		'@type'               => 'WebApplication',
		'name'                => 'Wedding Dress Size Calculator',
		'url'                 => $page_url,
		'description'         => 'Enter bust, waist and hip measurements to see which size fits on a specific bridal designer\'s published size chart, and what would need taking in.',
		'applicationCategory' => 'UtilitiesApplication',
		'operatingSystem'     => 'Any',
		'browserRequirements' => 'Requires JavaScript',
		'isAccessibleForFree' => true,
		'offers'              => array(
			'@type'         => 'Offer',
			'price'         => '0',
			'priceCurrency' => 'USD',
		),
	);

	$questions = array();
	foreach ( $faqs as $faq ) {
		$questions[] = array(
			'@type'          => 'Question',
			'name'           => $faq['q'],
			'acceptedAnswer' => array(
				'@type' => 'Answer',
				'text'  => trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( str_replace( ' (opens in a new tab)', '', $faq['a'] ) ) ) ),
			),
		);
	}
	$graphs[] = array(
		'@context'   => 'https://schema.org',
		'@type'      => 'FAQPage',
		'mainEntity' => $questions,
	);

	// Rank Math adds its own BreadcrumbList when its breadcrumbs are enabled;
	// two would conflict, so only add ours when it does not.
	if ( apply_filters( 'wdsc_output_breadcrumb_schema', ! wdsc_rank_math_breadcrumbs_on() ) ) {
		$graphs[] = array(
			'@context'        => 'https://schema.org',
			'@type'           => 'BreadcrumbList',
			'itemListElement' => array(
				array(
					'@type'    => 'ListItem',
					'position' => 1,
					'name'     => 'Home',
					'item'     => home_url( '/' ),
				),
				array(
					'@type'    => 'ListItem',
					'position' => 2,
					'name'     => 'Wedding Dress Size Calculator',
					'item'     => $page_url,
				),
			),
		);
	}

	return $graphs;
}

/* -------------------------------------------------------------------------
 * Assets: only on pages that use the shortcode.
 * ---------------------------------------------------------------------- */

function wdsc_page_uses_shortcode() {
	if ( ! is_singular() ) {
		return false;
	}
	$post = get_post();
	if ( ! $post ) {
		return false;
	}
	if ( has_shortcode( $post->post_content, WDSC_SHORTCODE ) ) {
		return true;
	}
	// Elementor keeps the Shortcode widget's content in post meta.
	$elementor = get_post_meta( $post->ID, '_elementor_data', true );
	return is_string( $elementor ) && false !== strpos( $elementor, WDSC_SHORTCODE );
}

function wdsc_register_assets() {
	$css = WDSC_DIR . 'assets/calculator.css';
	$js  = WDSC_DIR . 'assets/calculator.js';
	wp_register_style( 'wdsc', WDSC_URL . 'assets/calculator.css', array(), WDSC_VERSION . '.' . (int) @filemtime( $css ) );
	wp_register_script( 'wdsc', WDSC_URL . 'assets/calculator.js', array(), WDSC_VERSION . '.' . (int) @filemtime( $js ), true );

	if ( wdsc_page_uses_shortcode() ) {
		wp_enqueue_style( 'wdsc' );
	}
}
add_action( 'wp_enqueue_scripts', 'wdsc_register_assets' );

/* -------------------------------------------------------------------------
 * Shortcode
 * ---------------------------------------------------------------------- */

function wdsc_render() {
	// Late enqueue covers pages where the shortcode was not detected early.
	wp_enqueue_style( 'wdsc' );
	wp_enqueue_script( 'wdsc' );

	$loaded   = wdsc_load_data();
	$data     = $loaded ? $loaded['data'] : null;
	$raw      = $loaded ? $loaded['raw'] : '';
	$links    = wdsc_links();
	$page_url = get_permalink();
	$faqs     = wdsc_faqs( $data, $links );
	$schema   = wdsc_schema( $faqs, $page_url );
	$example  = array( 'bust' => 36, 'waist' => 30, 'hips' => 40 );

	ob_start();
	include WDSC_DIR . 'templates/calculator.php';
	return ob_get_clean();
}
add_shortcode( WDSC_SHORTCODE, 'wdsc_render' );
