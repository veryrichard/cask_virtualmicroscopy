/*
	jQuery Autosize v1.16.5
	(c) 2013 Jack Moore - jacklmoore.com
	updated: 2013-02-11
	license: http://www.opensource.org/licenses/mit-license.php
*/
/*
 * Adapted: added CASK stuff to handle the font-size change upon zoom Paul Gobee
 * 
 */

(function ($) {
	var
	defaults = {
		className: 'autosizejs',
		append: '',
		callback: false
	},
	hidden = 'hidden',
	borderBox = 'border-box',
	lineHeight = 'lineHeight',

	// border:0 is unnecessary, but avoids a bug in FireFox on OSX (http://www.jacklmoore.com/autosize#comment-851)
	copy = '<textarea tabindex="-1" style="position:absolute; top:-999px; left:0; right:auto; bottom:auto; border:0; -moz-box-sizing:content-box; -webkit-box-sizing:content-box; box-sizing:content-box; word-wrap:break-word; height:0 !important; min-height:0 !important; overflow:hidden;"/>',

	// line-height is conditionally included because IE7/IE8/old Opera do not return the correct value.
	copyStyle = [
		'fontFamily',
		'fontSize',
		'fontWeight',
		'fontStyle',
		'letterSpacing',
		'textTransform',
		'wordSpacing',
		'textIndent'
	],
	oninput = 'oninput',
	onpropertychange = 'onpropertychange',

	// to keep track which textarea is being mirrored when adjust() is called.
	mirrored,

	// the mirror element, which is used to calculate what size the mirrored element should be.
	mirror = $(copy).data('autosize', true)[0];

	// test that line-height can be accurately copied.
	mirror.style.lineHeight = '99px';
	if ($(mirror).css(lineHeight) === '99px') {
		copyStyle.push(lineHeight);
	}
	mirror.style.lineHeight = '';

	$.fn.autosize = function (options) {
		options = $.extend({}, defaults, options || {});

		if (mirror.parentNode !== document.body) {
			$(document.body).append(mirror);
		}

		return this.each(function () {
			var
			ta = this,
			$ta = $(ta),
			minHeight,
			active,
			resize,
			boxOffset = 0,
			callback = $.isFunction(options.callback);

			if ($ta.data('autosize')) {
				// exit if autosize has already been applied, or if the textarea is the mirror element.
				return;
			}

			if ($ta.css('box-sizing') === borderBox || $ta.css('-moz-box-sizing') === borderBox || $ta.css('-webkit-box-sizing') === borderBox){
				boxOffset = $ta.outerHeight() - $ta.height();
			}

			minHeight = Math.max(parseInt($ta.css('minHeight'), 10) - boxOffset, $ta.height());

			////////////////////////////////////////////////////////////////////////////
			//CASK CHANGE: because our text areas are draggable, which renders the resize not working anymore: then also hide the handle to prevent user confusion
			//resize = ($ta.css('resize') === 'none' || $ta.css('resize') === 'vertical') ? 'none' : 'horizontal';
			resize = 'none';
			//END CASK CHANGE
			////////////////////////////////////////////////////////////////////////////					
			
			$ta.css({
				overflow: hidden,
				overflowY: hidden,
				wordWrap: 'break-word',
				resize: resize
			}).data('autosize', true);

			function initMirror() {
				mirrored = ta;
				mirror.className = options.className;

				// mirror is a duplicate textarea located off-screen that
				// is automatically updated to contain the same text as the
				// original textarea.  mirror always has a height of 0.
				// This gives a cross-browser supported way getting the actual
				// height of the text, through the scrollTop property.
				$.each(copyStyle, function(i, val){
					mirror.style[val] = $ta.css(val);
				});
			}

			// Using mainly bare JS in this function because it is going
			// to fire very often while typing, and needs to very efficient.
			function adjust() {
				var height, overflow, original;
				//ih("triggered adjust");
				if (mirrored !== ta) {
					initMirror();
				}

				// the active flag keeps IE from tripping all over itself.  Otherwise
				// actions in the adjust function will cause IE to call adjust again.
				if (!active) {
					active = true;
					
					////////////////////////////////////////////////////////////////////////////					
					//CASK INSERT : Copy the font-size of the labels to the mirror (is influenced by zoom level)				
					var caskTextAreaFontSize = jQ(ta).css("font-size")
					if(caskTextAreaFontSize)
						{mirror.style.fontSize = caskTextAreaFontSize;}
					mirror.style.lineHeight = 1.1; //this is neccessary on ff
					//END CASK INSERT
					////////////////////////////////////////////////////////////////////////////					
					
					mirror.value = ta.value + options.append;
					mirror.style.overflowY = ta.style.overflowY;
					original = parseInt(ta.style.height,10);

					// Update the width in case the original textarea width has changed
					// A floor of 0 is needed because IE8 returns a negative value for hidden textareas, raising an error.
					mirror.style.width = Math.max($ta.width(), 0) + 'px';

					// The following three lines can be replaced with `height = mirror.scrollHeight` when dropping IE7 support.
					mirror.scrollTop = 0;
					mirror.scrollTop = 9e4;
					height = mirror.scrollTop;
					//ih(height)
					////////////////////////////////////////////////////////////////////////////
					//CASK INSERT :empirically determined correction factors because of the zoom: worked well on FF but exploded on IE and Chrome
				//	var factor = parseInt(caskTextAreaFontSize)/16;
				//	height= (height * factor) - (6*factor);
					//END CASK INSERT
					////////////////////////////////////////////////////////////////////////////
					
					var maxHeight = parseInt($ta.css('maxHeight'), 10);
					// Opera returns '-1px' when max-height is set to 'none'.
					maxHeight = maxHeight && maxHeight > 0 ? maxHeight : 9e4;
					if (height > maxHeight) {
						height = maxHeight;
						overflow = 'scroll';
					} else if (height < minHeight) {
						height = minHeight;
					}
					height += boxOffset;
					ta.style.overflowY = overflow || hidden;

					if (original !== height) {
						ta.style.height = height + 'px';
						if (callback) {
							options.callback.call(ta);
						}
					}

					// This small timeout gives IE a chance to draw it's scrollbar
					// before adjust can be run again (prevents an infinite loop).
					setTimeout(function () {
						active = false;
					}, 1);
				}
			}

			if (onpropertychange in ta) {
				if (oninput in ta) {
					// Detects IE9.  IE9 does not fire onpropertychange or oninput for deletions,
					// so binding to onkeyup to catch most of those occassions.  There is no way that I
					// know of to detect something like 'cut' in IE9.
					ta[oninput] = ta.onkeyup = adjust;
				} else {
					// IE7 / IE8
					ta[onpropertychange] = adjust;
				}
			} else {
				// Modern Browsers
				ta[oninput] = adjust;
			}

			$(window).resize(function(){
				active = false;
				adjust();
			});

			// Allow for manual triggering if needed.
			$ta.bind('autosize', function(){
				active = false;
				adjust();
			});

			// Call adjust in case the textarea already contains text.
			adjust();
		});
	};
}(window.jQuery || window.Zepto));
