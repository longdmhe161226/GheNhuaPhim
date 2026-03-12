$(function () {
	$(document).on('click', '.tree-container', onClick);
	$(document).on('click', '.plugin', onClick);
	function onClick() {
		if ($('#plug2').is(':visible')) {
			$('.message').hide();
			$('.glow').hide();
			$('#plug2').hide();
			$('#plug1').show();
		} else {
			$('.glow').show();
			$('.message').show();
			$('#plug2').show();
			$('#plug1').hide();
		}
		$('.snowflake').toggleClass('animations-off');
		$('.star').toggleClass('animations-off');
		$('.christmas-tree').toggleClass('animations-off');
		$('.gift').toggleClass('animations-off');
		$('.gift > div').toggleClass('animations-off');
	}
})