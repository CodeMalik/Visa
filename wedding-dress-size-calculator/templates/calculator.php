<?php
/**
 * Calculator and article markup, included by wdsc_render().
 *
 * Available: $data (array|null), $raw (string), $links, $page_url, $faqs,
 * $schema, $example.
 *
 * Ads: none. Commented slots below mark the only places ad code may go after
 * AdSense approval: inside the article, never in or beside the tool
 * (docs/build-kit/ADSENSE-COMPLIANCE.md §2).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$wdsc_fields = array(
	'bust'  => 'Around the fullest part of your bust, wearing the bra you plan to wear with the dress. Keep the tape level across your back.',
	'waist' => 'Around your natural waist: the narrowest part of your torso, usually higher than where trousers sit. This is the measurement most often taken in the wrong place, so take it twice.',
	'hips'  => 'With your feet together, around the fullest part of your hips and seat, keeping the tape level all the way round.',
);
?>
<div class="wdsc<?php echo $data ? '' : ' wdsc-failed'; ?>" id="wdsc" data-unit="in">
<script>
document.documentElement.classList.add('wdsc-js');
window.addEventListener('load', function () {
	if (!window.wdscReady) {
		document.documentElement.classList.add('wdsc-failed');
	}
});
</script>

<section class="wdsc-tool" aria-labelledby="wdsc-tool-title">
	<h2 id="wdsc-tool-title">Find the matching size on a designer&rsquo;s chart</h2>
	<p class="wdsc-lede">Enter three measurements and choose a designer. You will see which size on that designer&rsquo;s published chart fits all three, where each measurement lands, and what would need taking in. Everything runs in your browser: nothing you enter is saved or sent anywhere.</p>

	<div class="wdsc-fallback">
		<p><strong>The calculator could not start in this browser.</strong> You can still compare your measurements with each designer&rsquo;s own size chart:</p>
		<ul>
			<?php foreach ( wdsc_fallback_charts() as $wdsc_chart ) : ?>
				<li><?php echo wdsc_external_link( $wdsc_chart['url'], $wdsc_chart['name'] . ' size chart' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></li>
			<?php endforeach; ?>
		</ul>
		<p>The guide to <a href="#wdsc-between-sizes">measurements that fall in different sizes</a> below explains how to choose.</p>
	</div>

	<?php if ( $data ) : ?>
	<form class="wdsc-form" novalidate>
		<fieldset class="wdsc-units">
			<legend>Units</legend>
			<div class="wdsc-toggle">
				<label class="wdsc-toggle-option"><input type="radio" name="wdsc-unit" id="wdsc-unit-in" value="in" checked><span>Inches</span></label>
				<label class="wdsc-toggle-option"><input type="radio" name="wdsc-unit" id="wdsc-unit-cm" value="cm"><span>Centimetres</span></label>
			</div>
		</fieldset>

		<div class="wdsc-field">
			<label for="wdsc-brand">Designer</label>
			<select id="wdsc-brand" aria-describedby="wdsc-brand-hint wdsc-brand-msg">
				<option value="">Choose a brand</option>
				<?php foreach ( $data['brands'] as $wdsc_brand ) : ?>
					<option value="<?php echo esc_attr( $wdsc_brand['brand_id'] ); ?>"><?php echo esc_html( $wdsc_brand['brand_name'] ); ?></option>
				<?php endforeach; ?>
			</select>
			<p class="wdsc-hint" id="wdsc-brand-hint">Sizing is not standardised across designers, so choose the one you are ordering from.</p>
			<p class="wdsc-msg" id="wdsc-brand-msg" hidden></p>
		</div>

		<p class="wdsc-measure-note">Measure over the undergarments you plan to wear, and ask someone else to hold the tape if you can. <a href="<?php echo esc_url( $links['underwear'] ); ?>">What to wear under a wedding dress</a>.</p>

		<?php foreach ( $wdsc_fields as $wdsc_field => $wdsc_guide ) : ?>
		<div class="wdsc-field">
			<label for="wdsc-<?php echo esc_attr( $wdsc_field ); ?>"><?php echo esc_html( ucfirst( $wdsc_field ) ); ?> <span class="wdsc-unit-label">(in)</span></label>
			<input type="text" id="wdsc-<?php echo esc_attr( $wdsc_field ); ?>" inputmode="decimal" autocomplete="off" spellcheck="false" aria-describedby="wdsc-<?php echo esc_attr( $wdsc_field ); ?>-msg">
			<p class="wdsc-msg" id="wdsc-<?php echo esc_attr( $wdsc_field ); ?>-msg" hidden></p>
			<details class="wdsc-guide">
				<summary>How to measure your <?php echo esc_html( $wdsc_field ); ?></summary>
				<div class="wdsc-guide-body">
					<?php echo wdsc_diagram( $wdsc_field ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<p><?php echo esc_html( $wdsc_guide ); ?></p>
				</div>
			</details>
		</div>
		<?php endforeach; ?>

		<button type="submit" class="wdsc-button">Find the matching size</button>
		<p class="wdsc-small">Nothing you enter is saved or sent anywhere. The calculation happens on your device.</p>
	</form>

	<div id="wdsc-result" class="wdsc-result" aria-live="polite"></div>

	<script type="application/json" id="wdsc-data"><?php echo str_replace( '</', '<\/', $raw ); // phpcs:ignore WordPress.Security.EscapeOutput -- JSON data, "</" neutralised. ?></script>
	<script type="application/json" id="wdsc-config"><?php echo wp_json_encode( array( 'links' => $links, 'pageUrl' => $page_url ), JSON_HEX_TAG | JSON_HEX_AMP ); ?></script>
	<?php endif; ?>
</section>

<article class="wdsc-article">

<section aria-labelledby="wdsc-why">
	<h2 id="wdsc-why">Why bridal sizes run larger than your usual size</h2>
	<p>If the size this calculator shows is higher than the number on the clothes you usually buy, nothing has gone wrong. Wedding gowns use a different numbering system from everyday clothing. According to <?php echo wdsc_external_link( 'https://www.theknot.com/content/wedding-dress-sizes', 'The Knot' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>, bridal sizing runs roughly three sizes larger than everyday sizing, because it grew out of 1940s European sizing and was never brought into line with modern clothing labels.</p>
	<p>There is no single bridal standard either. Each designer publishes its own chart, so the same measurements can match one size at one designer and a different size at another. That is why this calculator asks which designer you are ordering from, and why it never gives a single &ldquo;bridal size&rdquo;.</p>
	<p>The size on a wedding dress label describes how that designer cuts the gown. It is a fitting reference for you and your seamstress, and nothing more.</p>
</section>

<section id="wdsc-how-to-measure" aria-labelledby="wdsc-measure-title">
	<h2 id="wdsc-measure-title">How to measure for a wedding dress</h2>
	<p>Three measurements decide a bridal size. Use a soft tape measure, stand naturally, and keep the tape snug and flat without pulling it tight.</p>
	<?php foreach ( $wdsc_fields as $wdsc_field => $wdsc_guide ) : ?>
		<h3><?php echo esc_html( ucfirst( $wdsc_field ) ); ?></h3>
		<p><?php echo esc_html( $wdsc_guide ); ?></p>
	<?php endforeach; ?>
	<h3>Tips that prevent the usual mistakes</h3>
	<ul>
		<li>Measure over the undergarments you plan to wear on the day. Our guide to <a href="<?php echo esc_url( $links['underwear'] ); ?>">what to wear under a wedding dress</a> helps you choose them first.</li>
		<li>Ask someone else to hold the tape. Measuring yourself tends to tilt the tape and change the number.</li>
		<li>Find your natural waist by bending to one side: the crease that forms is where it sits.</li>
		<li>Write each measurement down straight away, in the units you will enter.</li>
	</ul>
</section>

<!-- AD SLOT (editorial only). Ad code may go here after AdSense approval. Never move ads into, beside, or directly below the calculator. -->

<section id="wdsc-between-sizes" aria-labelledby="wdsc-between-title">
	<h2 id="wdsc-between-title">What to do when your measurements are in different sizes</h2>
	<p>Most people&rsquo;s bust, waist and hips do not all land in the same size on a bridal chart. When they do not, the usual rule is to order the size that matches your largest measurement, then have the dress taken in where it is loose.</p>
	<p>The reason is that alteration works much better in one direction than the other. <?php echo wdsc_external_link( 'https://www.theknot.com/content/wedding-dress-sizes', 'The Knot' ); // phpcs:ignore WordPress.Security.EscapeOutput ?> notes that a gown can typically be taken in about two sizes but let out by only one, because there is only so much spare fabric in the seams. A dress ordered too small may not be fixable; a dress ordered to fit your largest measurement needs a fitting.</p>
	<?php
	$wdsc_maggie_rule = null;
	if ( $data && ! empty( $data['sizing_rule']['support'] ) ) {
		foreach ( $data['sizing_rule']['support'] as $wdsc_support ) {
			if ( false !== strpos( $wdsc_support['url'], 'maggiesottero.com' ) ) {
				$wdsc_maggie_rule = $wdsc_support;
			}
		}
	}
	if ( $wdsc_maggie_rule ) :
		?>
		<blockquote class="wdsc-quote">
			<p>&ldquo;<?php echo esc_html( $wdsc_maggie_rule['says'] ); ?>&rdquo;</p>
			<footer><?php echo wdsc_external_link( $wdsc_maggie_rule['url'], $wdsc_maggie_rule['source'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?></footer>
		</blockquote>
	<?php endif; ?>

	<?php if ( $data ) : ?>
		<?php
		$wdsc_rows     = array();
		$wdsc_answers  = array();
		foreach ( $data['brands'] as $wdsc_brand ) {
			$wdsc_r = wdsc_calculate( $wdsc_brand, $example );
			if ( $wdsc_r ) {
				$wdsc_rows[]    = array( 'brand' => $wdsc_brand, 'r' => $wdsc_r );
				$wdsc_answers[] = $wdsc_r['recommended'];
			}
		}
		?>
		<h3>One set of measurements, <?php echo count( $wdsc_rows ); ?> charts</h3>
		<p>Here is how example measurements of <?php echo esc_html( wdsc_num( $example['bust'] ) . ' / ' . wdsc_num( $example['waist'] ) . ' / ' . wdsc_num( $example['hips'] ) ); ?> inches land on each chart in this calculator.</p>
		<div class="wdsc-table-wrap">
			<table class="wdsc-example">
				<caption>Example: bust <?php echo esc_html( wdsc_num( $example['bust'] ) ); ?> in, waist <?php echo esc_html( wdsc_num( $example['waist'] ) ); ?> in, hips <?php echo esc_html( wdsc_num( $example['hips'] ) ); ?> in</caption>
				<thead>
					<tr>
						<th scope="col">Designer</th>
						<th scope="col">Bust matches</th>
						<th scope="col">Waist matches</th>
						<th scope="col">Hips match</th>
						<th scope="col">Size that fits all three</th>
					</tr>
				</thead>
				<tbody>
				<?php foreach ( $wdsc_rows as $wdsc_row ) : ?>
					<tr data-brand="<?php echo esc_attr( $wdsc_row['brand']['brand_id'] ); ?>">
						<th scope="row"><?php echo esc_html( $wdsc_row['brand']['brand_name'] ); ?></th>
						<?php foreach ( array( 'bust', 'waist', 'hips' ) as $wdsc_field ) : ?>
							<?php $wdsc_sets = in_array( $wdsc_field, $wdsc_row['r']['deciding'], true ) && $wdsc_row['r']['straddle'] > 1; ?>
							<td<?php echo $wdsc_sets ? ' class="wdsc-deciding"' : ''; ?>>
								<?php echo esc_html( $wdsc_row['r']['size_for'][ $wdsc_field ] ); ?>
								<?php if ( $wdsc_sets ) : ?>
									<span class="wdsc-arrow" aria-hidden="true">&larr;</span> <span class="wdsc-small">sets the size</span>
								<?php endif; ?>
							</td>
						<?php endforeach; ?>
						<td class="wdsc-answer"><strong><?php echo esc_html( $wdsc_row['r']['recommended'] ); ?></strong></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<?php if ( count( array_unique( $wdsc_answers ) ) > 1 ) : ?>
			<p>The same measurements give a different answer depending on the chart, and within a single chart the three measurements do not always agree. That is why the calculator shows where each measurement lands, which one sets the size, and what would need taking in, rather than a single number.</p>
		<?php endif; ?>
	<?php endif; ?>
	<p>Planning the fittings that follow? See <a href="<?php echo esc_url( $links['fittings'] ); ?>">how many wedding dress fittings you need</a> and <a href="<?php echo esc_url( $links['alterations'] ); ?>">what alterations usually cost</a>.</p>
</section>

<section id="wdsc-charts" aria-labelledby="wdsc-charts-title">
	<h2 id="wdsc-charts-title">The size charts behind this calculator</h2>
	<?php if ( $data ) : ?>
		<p>Every size in this calculator comes from the designer&rsquo;s own published chart, entered exactly as published, with the date we last checked it. Charts change, so confirm against the designer&rsquo;s current chart before you order.</p>
		<div class="wdsc-table-wrap">
			<table class="wdsc-index">
				<caption>Size charts used, with sources</caption>
				<thead>
					<tr>
						<th scope="col">Designer</th>
						<th scope="col">Chart</th>
						<th scope="col">Sizes</th>
						<th scope="col">Published in</th>
						<th scope="col">Checked</th>
						<th scope="col">Source</th>
					</tr>
				</thead>
				<tbody>
				<?php foreach ( $data['brands'] as $wdsc_brand ) : ?>
					<?php $wdsc_sizes = $wdsc_brand['sizes']; ?>
					<tr>
						<th scope="row"><?php echo esc_html( $wdsc_brand['brand_name'] ); ?></th>
						<td><?php echo esc_html( $wdsc_brand['chart_label'] ); ?></td>
						<td><?php echo esc_html( $wdsc_sizes[0]['size'] . ' to ' . $wdsc_sizes[ count( $wdsc_sizes ) - 1 ]['size'] ); ?></td>
						<td><?php echo esc_html( wdsc_unit_name( $wdsc_brand['units'] ) ); ?></td>
						<td><time datetime="<?php echo esc_attr( $wdsc_brand['captured'] ); ?>"><?php echo esc_html( wdsc_date( $wdsc_brand['captured'] ) ); ?></time></td>
						<td><?php echo wdsc_external_link( $wdsc_brand['source_url'], 'Official chart' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<ul class="wdsc-chart-notes">
		<?php foreach ( $data['brands'] as $wdsc_brand ) : ?>
			<?php if ( ! empty( $wdsc_brand['custom_sizing_available'] ) ) : ?>
				<li><strong><?php echo esc_html( $wdsc_brand['brand_name'] ); ?>:</strong> also offers custom sizing.</li>
			<?php endif; ?>
			<?php foreach ( wdsc_unusual_values( $wdsc_brand ) as $wdsc_odd ) : ?>
				<li><strong><?php echo esc_html( $wdsc_brand['brand_name'] ); ?>:</strong> size <?php echo esc_html( $wdsc_odd['size'] ); ?> <?php echo esc_html( $wdsc_odd['field'] ); ?> is published as <?php echo esc_html( wdsc_num( $wdsc_odd['value'] ) . ' ' . $wdsc_brand['units'] ); ?>, an unusual value for this chart that may be a typo at the source. It is shown and used exactly as published.</li>
			<?php endforeach; ?>
		<?php endforeach; ?>
		</ul>
		<?php if ( ! empty( $data['excluded_brands'] ) ) : ?>
			<?php
			$wdsc_excluded = array();
			foreach ( $data['excluded_brands'] as $wdsc_ex ) {
				$wdsc_excluded[] = $wdsc_ex['brand_name'];
			}
			?>
			<p><strong>Not included yet:</strong> <?php echo esc_html( implode( ', ', $wdsc_excluded ) ); ?>. We add a designer only once we can link to its own official size chart.</p>
		<?php endif; ?>
	<?php else : ?>
		<p>The chart list is unavailable right now. Each designer&rsquo;s official chart:</p>
		<ul>
			<?php foreach ( wdsc_fallback_charts() as $wdsc_chart ) : ?>
				<li><?php echo wdsc_external_link( $wdsc_chart['url'], $wdsc_chart['name'] . ' size chart' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></li>
			<?php endforeach; ?>
		</ul>
	<?php endif; ?>
</section>

<!-- AD SLOT (editorial only). Ad code may go here after AdSense approval. -->

<section id="wdsc-faq" aria-labelledby="wdsc-faq-title">
	<h2 id="wdsc-faq-title">Frequently asked questions</h2>
	<?php foreach ( $faqs as $wdsc_faq ) : ?>
		<h3><?php echo esc_html( $wdsc_faq['q'] ); ?></h3>
		<p><?php echo $wdsc_faq['a']; // phpcs:ignore WordPress.Security.EscapeOutput -- fixed copy defined in wdsc_faqs(). ?></p>
	<?php endforeach; ?>
</section>

<section aria-labelledby="wdsc-related-title">
	<h2 id="wdsc-related-title">Related guides</h2>
	<ul class="wdsc-related">
		<li><a href="<?php echo esc_url( $links['alterations'] ); ?>">Wedding dress alterations cost guide</a></li>
		<li><a href="<?php echo esc_url( $links['fittings'] ); ?>">How many wedding dress fittings do you need?</a></li>
		<li><a href="<?php echo esc_url( $links['timeline'] ); ?>">Wedding dress shopping timeline and checklist</a></li>
		<li><a href="<?php echo esc_url( $links['underwear'] ); ?>">What to wear under a wedding dress</a></li>
		<li><a href="<?php echo esc_url( $links['plusSize'] ); ?>">Plus-size wedding dress guide</a></li>
		<li><a href="<?php echo esc_url( $links['secondhand'] ); ?>">Secondhand wedding dress buying guide</a></li>
		<li><a href="<?php echo esc_url( $links['comparison'] ); ?>">David&rsquo;s Bridal vs Azazie compared</a></li>
		<li><a href="<?php echo esc_url( $links['affordable'] ); ?>">Affordable wedding dresses under $500</a></li>
		<li><a href="<?php echo esc_url( $links['modest'] ); ?>">Modest wedding dresses with sleeves</a></li>
		<li><a href="<?php echo esc_url( $links['rentOrBuy'] ); ?>">Renting vs buying a wedding dress</a></li>
	</ul>
</section>

</article>

<?php foreach ( $schema as $wdsc_graph ) : ?>
<script type="application/ld+json"><?php echo wp_json_encode( $wdsc_graph, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ); ?></script>
<?php endforeach; ?>
</div>
