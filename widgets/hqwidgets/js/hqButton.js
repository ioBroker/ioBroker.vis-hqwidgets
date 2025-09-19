vis.binds.hqwidgets.button = {
    showRightInfo: function ($div, value) {
        const data = $div.data('data');

        let time = null;
        let timer = null;
        if (data.hoursLastAction) {
            // show time interval. It must be updated every minute
            if (data.timeAsInterval) {
                time = vis.binds.hqwidgets.getTimeInterval(data.lc, data.hoursLastAction);
                $div.find('.vis-hq-time').html(time);
                if (!vis.editMode) {
                    timer = $div.data('lastTimer');
                    if (!timer) {
                        timer = setInterval(function () {
                            const time = vis.binds.hqwidgets.getTimeInterval(data.lc, data.hoursLastAction);
                            $div.find('.vis-hq-time').html(time);

                            if (time && $div.find('.vis-hq-time').text()) {
                                $div.find('.vis-hq-rightinfo').show();
                            } else {
                                $div.find('.vis-hq-rightinfo').hide();
                            }
                        }, 60000);

                        $div.data('lastTimer', timer);
                    }
                }
            } else {
                // Show static date
                time = vis.binds.basic.formatDate(data.lc, data.format_date);
                $div.find('.vis-hq-time').html(time);
            }
        }

        // Kill timer if not required
        if (!timer) {
            const t = $div.data('lastTimer');
            if (t) {
                clearTimeout(t);
                $div.data('lastTimer', null);
            }
        }

        // Set number value
        let text = null;
        if (data.wType === 'number' && data.oid) {
            let html =
                (value === undefined || value === null ? data.min : value) +
                (data.unit === undefined || data.unit === null ? '' : data.unit);
            if (data.drive !== undefined && data.drive !== null) {
                html += `<br><span class="vis-hq-drive">${data.drive}</span>`;
                if (!data.valveBinary) {
                    html += '%';
                }
            }
            text = $div.find('.vis-hq-rightinfo-text').html(html);
        }

        // Hide right info if empty
        if (data.infoRight || time || (text && text.text())) {
            $div.find('.vis-hq-rightinfo').show();
        } else {
            $div.find('.vis-hq-rightinfo').hide();
        }
    },
    showCenterInfo: function ($div, isHide, reInit) {
        const data = $div.data('data');
        if (!data) return;

        let $c = $div.find('.vis-hq-centerinfo');
        if (
            reInit ||
            (data.humidity !== undefined && data.humidity !== null) ||
            (data.actual !== undefined && data.actual !== null)
        ) {
            if (isHide) {
                $c.hide();
                $div.find('.vis-hq-middle').css('opacity', 1);
            } else {
                if (!$div.is(':visible')) {
                    if (!data.showCenterInfo) {
                        data.showCenterInfo = setTimeout(function () {
                            data.showCenterInfo = null;
                            vis.binds.hqwidgets.button.showCenterInfo($div, isHide, reInit);
                        }, 1000);
                    }
                    return;
                }

                if (reInit || !$c.length) {
                    $c.remove();
                    let text =
                        '<table class="vis-hq-centerinfo vis-hq-no-space" style="z-index: 2;position: absolute' +
                        (data.midTextColor ? `;color: ${data.midTextColor}` : '') +
                        '">';

                    if (data.actual !== undefined && data.actual !== null) {
                        text += `<tr class="vis-hq-actual-style vis-hq-no-space"><td class="vis-hq-no-space"><span class="vis-hq-actual"></span>${data.unit === undefined && data.unit === null ? '' : data.unit}</tr>`;
                    }
                    if (data.humidity !== undefined && data.humidity !== null) {
                        text +=
                            '<tr class="vis-hq-humidity-style vis-hq-no-space"><td class="vis-hq-no-space"><span class="vis-hq-humidity"></span>%</td></tr>';
                    }

                    text += '</table>';
                    $div.find('.vis-hq-main').prepend(text);
                    $c = $div.find('.vis-hq-centerinfo');
                } else {
                    $c.show();
                }
                $div.find('.vis-hq-middle').css('opacity', 0.7);
                if (data.actual !== undefined && data.actual !== null) {
                    if (typeof data.actual !== 'number') {
                        data.actual = parseFloat(data.actual) || 0;
                    }
                    let val = data.digits !== null ? (data.actual || 0).toFixed(data.digits) : data.actual || 0;
                    if (data.is_comma) {
                        val = val.toString().replace('.', ',');
                    }

                    $div.find('.vis-hq-actual').html(val);
                }

                if (data.humidity !== undefined && data.humidity !== null) {
                    if (typeof data.humidity !== 'number') data.humidity = parseFloat(data.humidity) || 0;
                    $div.find('.vis-hq-humidity').html(Math.round(data.humidity || 0));
                }

                const $main = $div.find('.vis-hq-main');
                if ($c.length) {
                    $c.css({
                        top: ($main.height() - $c.height()) / 2,
                        left: ($main.width() - $c.width()) / 2,
                    });
                }
            }
        } else {
            $c.hide();
        }
    },
    centerImage: function ($div, data, $img) {
        // find the right position for image and caption in the middle
        const $main = $div.find('.vis-hq-main');
        if (!$img) $img = $div.find('.vis-hq-icon-img');

        if (data.offsetAuto) {
            if (!$div.is(':visible')) {
                if (!data.centerImage) {
                    data.centerImage = setTimeout(function () {
                        data.centerImage = null;
                        vis.binds.hqwidgets.button.centerImage($div, data, $img);
                    }, 1000);
                }
            } else {
                const $middle = $div.find('.vis-hq-table');
                $middle.css({
                    left: ($main.width() - $middle.width()) / 2,
                    top: ($main.height() - $middle.height()) / 2,
                });
                $img[0] &&
                    ($img[0].onload = function () {
                        const $middle = $div.find('.vis-hq-table');
                        $middle.css({
                            left: ($main.width() - $middle.width()) / 2,
                            top: ($main.height() - $middle.height()) / 2,
                        });
                    });
            }
        }
    },
    // Calculate state of button
    changeState: function ($div, isInit, isForce, isOwn) {
        const data = $div.data('data');
        if (!data) {
            return;
        }

        let value = data.tempValue !== undefined && data.tempValue !== null ? data.tempValue : data.value;

        if (!isForce && data.oldValue !== undefined && data.oldValue !== null && data.oldValue == value && !data.ack) {
            return;
        }

        if (data.wType === 'number') {
            value = parseFloat((value || 0).toString().replace(',', '.'));
        }
        data.oldValue = value;

        if (data.temperature) {
            data.state = 'normal';
        } else if (value == data.min) {
            data.state = 'normal';
        } else if (value == data.max) {
            data.state = 'active';
        } else if (
            data.max &&
            (value === null || value === '' || value === undefined || value === 'false' || value === false)
        ) {
            data.state = 'normal';
        } else {
            if (data.wType === 'number') {
                if (data.max) {
                    if (value > data.min) {
                        data.state = 'active';
                    } else {
                        data.state = 'normal';
                    }
                } else if (value) {
                    data.state = 'active';
                } else {
                    data.state = 'normal';
                }
            } else {
                if (data.max) {
                    if (value == data.max) {
                        data.state = 'active';
                    } else {
                        data.state = 'normal';
                    }
                } else if (value) {
                    data.state = 'active';
                } else {
                    data.state = 'normal';
                }
            }
        }

        if (vis.editMode && data.testActive) {
            data.state = data.state === 'normal' ? 'active' : 'normal';
        }

        if (value !== null && value !== undefined) {
            $div.find('.vis-hq-nodata').remove();
        }

        switch (data.state) {
            case 'normal':
                $(`#${data.wid} .vis-hq-main`).removeClass(data.styleActive).addClass(data.styleNormal);

                if (data.iconName || data.iconOn) {
                    const $img = $div.find('.vis-hq-icon-img');

                    if ($img.attr('src') !== (data.iconName || '')) {
                        $img.attr('src', data.iconName || '');
                        vis.binds.hqwidgets.button.centerImage($div, data, $img);
                    }
                }
                if (data.captionOn) {
                    $div.find('.vis-hq-text-caption').html(data.caption || '');
                }
                break;
            case 'active':
                $(`#${data.wid} .vis-hq-main`).removeClass(data.styleNormal).addClass(data.styleActive);

                if (data.iconName || data.iconOn) {
                    const $img = $div.find('.vis-hq-icon-img');

                    if ($img.attr('src') !== (data.iconOn || data.iconName)) {
                        $img.attr('src', data.iconOn || data.iconName);
                        vis.binds.hqwidgets.button.centerImage($div, data, $img);
                    }
                }
                if (data.captionOn) {
                    $div.find('.vis-hq-text-caption').html(data.captionOn);
                }
                break;
        }
        if (data.digits !== null && value !== null && value !== undefined) {
            if (typeof value !== 'number') {
                value = parseFloat(value) || 0;
            }
            value = value.toFixed(data.digits);
        }
        if (data.is_comma && value) {
            value = value.toString().replace('.', ',');
        }

        vis.binds.hqwidgets.button.showRightInfo($div, value);

        if ((!data.ack && !data['oid-working']) || (data['oid-working'] && data.working)) {
            $div.find('.vis-hq-working').show();
        } else {
            $div.find('.vis-hq-working').hide();
        }

        if (data['oid-battery']) $div.batteryIndicator('show', data.battery || false);

        if (data['oid-signal']) {
            $div.find('.vis-hq-signal').html(data.signal);
        }

        if (data['oid-humidity']) {
            const $h = $div.find('.vis-hq-humidity');
            if (!$h.length) {
                vis.binds.hqwidgets.button.showCenterInfo($div, false, true);
            } else {
                $h.html(Math.round(data.humidity || 0));
            }
        }

        if (data['oid-actual']) {
            const $a = $div.find('.vis-hq-actual');
            if (!$a.length) {
                vis.binds.hqwidgets.button.showCenterInfo($div, false, true);
            } else {
                if (typeof data.actual !== 'number') {
                    data.actual = parseFloat(data.actual) || 0;
                }
                let val = data.digits !== null ? (data.actual || 0).toFixed(data.digits) : data.actual || 0;
                if (data.is_comma) {
                    val = val.toString().replace('.', ',');
                }
                $a.html(val);
            }
        }

        if (data['oid-drive']) {
            $div.find('.vis-hq-drive').html(data.drive || 0);
        }

        // Show change effect
        if (data.changeEffect && ((!isInit && !isOwn) || (vis.editMode && data.testActive))) {
            const $main = $div.find('.vis-hq-main');
            $main.animateDiv(data.changeEffect, { color: data.waveColor });
        }
    },
    draw: function ($div) {
        if (!$div.is(':visible')) {
            setTimeout(function () {
                vis.binds.hqwidgets.button.draw($div);
            }, 100);
            return;
        }

        const data = $div.data('data');
        data.state = data.state || 'normal';
        const radius = $div.css('borderTopLeftRadius') || vis.views[data.view].widgets[data.wid].style['border-radius'];

        // place left-info, right-info, caption and image
        if (!$div.find('.vis-hq-main').length) {
            let text = '';
            if (!data.descriptionLeftDisabled && data.descriptionLeft) {
                if (data.infoLeftPaddingLeft === undefined || data.infoLeftPaddingLeft === null) {
                    data.infoLeftPaddingLeft = '15px';
                }
                if (data.infoLeftPaddingRight === undefined || data.infoLeftPaddingRight === null)
                    data.infoLeftPaddingRight = '50px';
                if (!data.infoLeftPaddingLeft.match(/px$|rem$|em$/)) {
                    data.infoLeftPaddingLeft = `${data.infoLeftPaddingLeft}px`;
                }
                if (!data.infoLeftPaddingRight.match(/px$|rem$|em$/)) {
                    data.infoLeftPaddingRight = `${data.infoLeftPaddingRight}px`;
                }

                text += `<div class="vis-hq-leftinfo" style="padding-left: ${data.infoLeftPaddingLeft}; padding-right: ${data.infoLeftPaddingRight}; font-size: ${data.infoLeftFontSize || 12}px${data.infoColor ? ';color: ' + data.infoColor : ''}${data.infoBackground ? ';background: ' + data.infoBackground : ''}"><span class="vis-hq-leftinfo-text">${(data.descriptionLeft || '').replace(/\s/g, '&nbsp;').replace(/\\n/g, '<br>')}</span></div>\n`;
            }
            if (data.infoRight || data.wType === 'number' || data.hoursLastAction) {
                if (data.infoRightPaddingLeft === undefined || data.infoRightPaddingLeft === null) {
                    data.infoRightPaddingLeft = 0;
                }
                if (data.infoRightPaddingRight === undefined || data.infoRightPaddingRight === null) {
                    data.infoRightPaddingRight = '15px';
                }
                if (!data.infoRightPaddingRight.match(/px$|rem$|em$/)) {
                    data.infoRightPaddingRight = `${data.infoRightPaddingRight}px`;
                }

                text += `<div class="vis-hq-rightinfo" style="padding-right: ${data.infoRightPaddingRight}; font-size: ${data.infoFontRightSize || 12}px${data.infoColor ? ';color: ' + data.infoColor : ''}${data.infoBackground ? ';background: ' + data.infoBackground : ''}"><span class="vis-hq-rightinfo-text">${(data.infoRight || '').replace(/\s/g, '&nbsp;').replace(/\\n/g, '<br>')}</span>`;

                if (data.hoursLastAction) {
                    if (data.infoRight || data.wType === 'number') {
                        text += '<br>';
                    }
                    text += '<span class="vis-hq-time"></span>';
                }

                text += '</div>\n';
            }
            text += '<div class="vis-hq-main" style="z-index: 1"><div class="vis-hq-middle">\n';

            if (data.offsetAuto) {
                text +=
                    '<table class="vis-hq-table vis-hq-no-space" style="position: absolute"><tr class="vis-hq-no-space"><td class="vis-hq-no-space"><div class="vis-hq-icon" style="text-align: center;"></div></td>\n';
            } else {
                text += `<table class="vis-hq-table vis-hq-no-space" style="position: absolute;top:${data.topOffset}%;left:${data.leftOffset}%"><tr class="vis-hq-no-space"><td class="vis-hq-no-space"><div class="vis-hq-icon" style="text-align: center;"></div></td>
`;
            }

            if (data.caption || data.captionOn) {
                if ($div.height() > $div.width()) text += '</tr><tr class="vis-hq-no-space">';
                text +=
                    '<td class="vis-hq-no-space"><div class="vis-hq-text-caption" style="text-align: center;"></div></td>';
            }

            text += '</tr></table></div></div></div>';
            $div.append(text);
        }

        // Get the border radius from parent
        const $main = $div.find('.vis-hq-main');
        $main.css({ 'border-radius': radius });
        $div.find('.vis-hq-text-caption').html(data.caption || '');

        const width = $div.width();
        let offset = width - 20 - parseInt(radius, 10);
        if (offset < width / 2) {
            offset = width / 2;
        }
        $div.find('.vis-hq-leftinfo').css({ right: `${offset}px` });
        $div.find('.vis-hq-rightinfo').css({
            'padding-left': `${5 + width / 2 + (parseInt(data.infoRightPaddingLeft, 10) || 0)}px`,
        });

        // Place icon
        let img = null;
        if (data.iconName || data.iconOn) {
            img = data.state === 'normal' ? data.iconName || '' : data.iconOn || '';
            $div.find('.vis-hq-icon')
                .html(
                    `<img class="vis-hq-icon-img" style="height: ${data.btIconWidth}px; width: auto;" src="${img || ''}"/>`,
                )
                .css('opacity', img ? 1 : 0);
        } else {
            $div.find('.vis-hq-icon').html('');
        }

        if (data['oid-battery']) $div.batteryIndicator();

        if (data['oid-working']) {
            $div.append('<div class="vis-hq-working"><span class="ui-icon ui-icon-gear"></span></div>');
        }

        // find the right position for image and caption in the middle
        if (data.offsetAuto) {
            vis.binds.hqwidgets.button.centerImage($div, data);
        }

        function onChange(e, newVal, oldVal) {
            if (e.type === `${data.oid}.val`) {
                if (data.wType === 'number') {
                    data.value = parseFloat(newVal || 0);
                } else {
                    data.value = newVal;
                }
                data.ack = vis.states[`${data.oid}.ack`];
                data.lc = vis.states[`${data.oid}.lc`];

                if (data.wType === 'number') {
                    if (newVal === false || newVal === 'false') {
                        data.value = data.min;
                    }
                    if (newVal === true || newVal === 'true') {
                        data.value = data.max;
                    }
                }
                data.tempValue = undefined;

                vis.binds.hqwidgets.button.changeState($div);

                if (data.wType === 'number') {
                    if (typeof data.value !== 'number') {
                        data.value = parseFloat(data.value) || 0;
                    }
                    let val = data.digits !== null ? data.value.toFixed(data.digits) : data.value;
                    if (data.is_comma) {
                        val = val.toString().replace('.', ',');
                    }
                    $main.scala('value', val);
                }
                return;
            } else if (e.type === `${data.oid}.ack`) {
                data.ack = vis.states[`${data.oid}.ack`];
                data.lc = vis.states[`${data.oid}.lc`];

                vis.binds.hqwidgets.button.changeState($div);
                return;
            } else if (e.type === `${data['oid-working']}.val`) {
                data.working = newVal;
            } else if (e.type === `${data['oid-battery']}.val`) {
                data.battery = newVal;
            } else if (e.type === `${data['oid-signal']}.val`) {
                data.signal = newVal;
            } else if (e.type === `${data['oid-humidity']}.val`) {
                data.humidity = newVal;
            } else if (e.type === `${data['oid-actual']}.val`) {
                data.actual = newVal;
            } else if (e.type === `${data['oid-drive']}.val`) {
                if (data.valveBinary === 'true' || data.valveBinary === true) {
                    if (newVal === null || newVal === undefined) {
                        newVal = 0;
                    }
                    if (newVal === 'true') {
                        newVal = true;
                    } else if (parseFloat(newVal).toString() === newVal.toString()) {
                        newVal = !!parseFloat(newVal);
                    } else if (newVal === 'false') {
                        newVal = false;
                    }
                    newVal = newVal ? _('opened') : _('closed');
                } else if (data.valve1 === 'true' || data.valve1 === true) {
                    // the value is from 0 to 1.01
                    newVal = Math.round((parseFloat(newVal) || 0) * 100);
                    if (newVal < 0) {
                        newVal = 0;
                    } else if (newVal > 100) {
                        newVal = 100;
                    }
                } else {
                    // no digits after comma
                    newVal = Math.round(parseFloat(newVal) || 0);
                }

                data.drive = newVal;
            }
            vis.binds.hqwidgets.button.changeState($div, false, true);
        }

        // action
        if (1 || !vis.editMode) {
            const bound = [];
            if (data.oid) {
                $div.append('<div class="vis-hq-nodata"><span class="ui-icon ui-icon-cancel"></span></div>');

                vis.states.bind(`${data.oid}.val`, onChange);
                vis.states.bind(`${data.oid}.ack`, onChange);
                bound.push(`${data.oid}.val`);
                bound.push(`${data.oid}.ack`);
            }
            if (data['oid-working']) {
                vis.states.bind(`${data['oid-working']}.val`, onChange);
                bound.push(`${data['oid-working']}.val`);
            }

            if (data['oid-battery']) {
                vis.states.bind(`${data['oid-battery']}.val`, onChange);
                bound.push(`${data['oid-battery']}.val`);
            }

            if (data['oid-signal']) {
                vis.states.bind(`${data['oid-signal']}.val`, onChange);
                bound.push(`${data['oid-signal']}.val`);
            }

            if (data['oid-humidity']) {
                vis.states.bind(`${data['oid-humidity']}.val`, onChange);
                bound.push(`${data['oid-humidity']}.val`);
            }

            if (data['oid-actual']) {
                vis.states.bind(`${data['oid-actual']}.val`, onChange);
                bound.push(`${data['oid-actual']}.val`);
            }

            if (data['oid-drive']) {
                vis.states.bind(`${data['oid-drive']}.val`, onChange);
                bound.push(`${data['oid-drive']}.val`);
            }
            // remember all ids, that bound
            $div.data('bound', bound);
            // remember bind handler
            $div.data('bindHandler', onChange);
        }

        // initiate state
        vis.binds.hqwidgets.button.changeState($div, true);

        // If dimmer or number
        if (data.wType === 'number') {
            const ff = parseFloat(data.set_by_click);
            if (ff.toString() == data.set_by_click) {
                data.set_by_click = ff;
            } else {
                data.set_by_click = undefined;
            }

            let scalaOptions;
            if (data.oid) {
                scalaOptions = {
                    change: function (value, notAck) {
                        // console.log(data.wid + ' filtered out:' + value + '(' + notAck + ')');
                        if (!notAck) {
                            return;
                        }

                        if (data.readOnly || (data.value || 0).toString() === value.toString()) {
                            return;
                        }
                        const setValue = parseFloat(value.toString().replace(',', '.')) || 0;

                        if (data.digits !== null) {
                            data.value = setValue.toFixed(data.digits);
                        } else {
                            data.value = setValue;
                        }
                        if (data.is_comma) {
                            data.value = data.value.toString().replace('.', ',');
                        }
                        data.ack = false;
                        data.tempValue = undefined;

                        vis.binds.hqwidgets.button.changeState($div, false, false, true);
                        vis.setValue(data.oid, setValue);
                    },
                    min: data.min,
                    max: data.max,
                    changing: function (value) {
                        // round to step
                        data.tempValue = Math.round(parseFloat(value) / data.step) * data.step;
                        vis.binds.hqwidgets.button.changeState($div, false, false, true);
                    },
                    click: function (val) {
                        val = data.value;
                        if (!data.temperature) {
                            // if "set by click" is defined and value is greater than a minimum, use "set by click" as value
                            if (data.set_by_click !== undefined) {
                                if (val > data.min) {
                                    val = data.min;
                                } else {
                                    val = data.set_by_click;
                                }
                            } else if (val - data.min > (data.max - data.min) / 20) {
                                // if greater than middle, then set to the minimum
                                val = data.min;
                            } else {
                                // else set to maximum
                                val = data.max;
                            }
                        } else {
                            data.tempValue = undefined;
                            vis.binds.hqwidgets.button.changeState($div, false, false, true);

                            // Show dialog
                            data.url && $div.popupDialog('show');
                        }
                        return val;
                    },
                    alwaysShow: data.alwaysShow,
                    onshow: function () {
                        if (!data.alwaysShow) {
                            vis.binds.hqwidgets.button.showCenterInfo($div, true);
                        }
                    },
                    onhide: function () {
                        vis.binds.hqwidgets.button.showCenterInfo($div);
                    },
                    hideNumber: !data.showValue || (data.temperature && data.alwaysShow),
                    readOnly: vis.editMode || data.readOnly,
                    step: data.step,
                    digits: data.digits,
                    isComma: data.is_comma,
                    width: (((100 + parseInt(data.circleWidth || 50, 10)) * width) / 100).toFixed(0),
                };
            }

            // show for temperature color depends on value
            if (data.temperature) {
                vis.binds.hqwidgets.button.showCenterInfo($div);

                if (scalaOptions) {
                    scalaOptions.color = 'black';
                    scalaOptions.colorize = function (color, value, isPrevious) {
                        const ratio = (value - data.min) / (data.max - data.min);
                        return `hsla(${180 + Math.round(180 * ratio)}, 70%, 50%, ${isPrevious ? 0.7 : 0.9})`;
                    };
                }
            }
            if (scalaOptions) {
                $main.scala(scalaOptions);
                $main.scala('value', data.value);
            }
        } else {
            if (!data.oidFalse && data.oidTrue) {
                data.oidFalse = data.oidTrue;
            }
            if (!data.urlFalse && data.urlTrue) {
                data.urlFalse = data.urlTrue;
            }
            if (data.min === undefined || data.min === 'false' || data.min === null) {
                data.min = false;
            }
            if (data.max === undefined || data.max === 'true' || data.max === null) {
                data.max = true;
            }
            if (data.oidTrueVal === undefined || data.oidTrueVal === null) {
                data.oidTrueVal = data.max;
            }
            if (data.oidTrueVal === 'false') {
                data.oidTrueVal = false;
            } else if (data.oidTrueVal === 'true') {
                data.oidTrueVal = true;
            }
            if (data.oidFalseVal === undefined || data.oidFalseVal === null) {
                data.oidFalseVal = data.min;
            }
            if (data.oidFalseVal === 'false') {
                data.oidFalseVal = false;
            } else if (data.oidFalseVal === 'true') {
                data.oidFalseVal = true;
            }
            let f = parseFloat(data.oidFalseVal);
            if (f.toString() == data.oidFalseVal) {
                data.oidFalseVal = f;
            }

            f = parseFloat(data.oidTrueVal);
            if (f.toString() == data.oidTrueVal) {
                data.oidTrueVal = f;
            }

            f = parseFloat(data.min);
            if (f.toString() == data.min) {
                data.min = f;
            }

            f = parseFloat(data.set_by_click);
            if (f.toString() == data.set_by_click) {
                data.set_by_click = f;
            } else {
                data.set_by_click = undefined;
            }

            f = parseFloat(data.max);
            if (f.toString() == data.max) {
                data.max = f;
            }

            if (
                !vis.editMode &&
                !data.readOnly &&
                (data.oid || data.urlFalse || data.urlTrue || data.oidFalse || data.oidTrue)
            ) {
                if (!data.pushButton) {
                    $main.on('click touchstart', function () {
                        // Protect against two events
                        if (vis.detectBounce(this)) {
                            return;
                        }

                        data.value = data.state === 'normal' ? data.max : data.min;
                        data.ack = false;

                        vis.binds.hqwidgets.button.changeState($div, false, false, true);

                        if (data.oidTrue) {
                            if (data.state !== 'normal') {
                                vis.setValue(data.oidTrue, data.oidTrueVal);
                            } else {
                                vis.setValue(data.oidFalse, data.oidFalseVal);
                            }
                        }

                        if (data.urlTrue) {
                            if (data.state !== 'normal') {
                                vis.conn.httpGet(data.urlTrue);
                            } else {
                                vis.conn.httpGet(data.urlFalse);
                            }
                        }

                        // show new state
                        if (data.oid && data.oid !== 'nothing_selected') {
                            vis.setValue(data.oid, data.value);
                        }
                    });
                } else {
                    $main.on('mousedown touchstart', function () {
                        // Reset bounce detector for mouseup event
                        if (this.__vis_lcu !== undefined) {
                            this.__vis_lcu = 0;
                        }
                        // Protect against two events
                        if (vis.detectBounce(this)) {
                            return;
                        }

                        vis.binds.hqwidgets.contextMenu(false);

                        data.value = data.max;
                        data.ack = false;
                        vis.binds.hqwidgets.button.changeState($div, false, false, true);

                        if (data.oidTrue) {
                            vis.setValue(data.oidTrue, data.oidTrueVal);
                        }
                        if (data.urlTrue) {
                            vis.conn.httpGet(data.urlTrue);
                        }
                        if (data.oid && data.oid !== 'nothing_selected') {
                            vis.setValue(data.oid, data.value);
                        }
                        // Install mouseup handler on document to be sure to catch it
                        $(document).one('mouseup touchend', function () {
                            // Protect against two events
                            if (vis.detectBounce(this, true)) {
                                return;
                            }

                            data.value = data.min;
                            data.ack = false;
                            vis.binds.hqwidgets.button.changeState($div, false, false, true);

                            if (data.oidFalse) {
                                vis.setValue(data.oidFalse, data.oidFalseVal);
                            }
                            if (data.urlFalse) {
                                vis.conn.httpGet(data.urlFalse);
                            }
                            if (data.oid && data.oid !== 'nothing_selected') {
                                vis.setValue(data.oid, data.value);
                            }

                            vis.binds.hqwidgets.contextMenu(true);
                        });
                    });
                }
            } else if (data.readOnly) {
                $div.addClass('vis-hq-readonly');
            }
        }

        // Chart dialog
        if (data.url /* && !vis.editMode*/) {
            $div.popupDialog({
                content: `<iframe src="${data.url || ''}" style="width: 100%; height: calc(100% - 5px); border: 0"></iframe>`,
                width: data.dialog_width,
                height: data.dialog_height,
                effect: data.dialog_effect,
                timeout: data.dialog_timeout,
                modal: data.dialog_modal,
                title: data.dialog_title || data['oid-actual'],
                open: data.dialog_open && vis.editMode,
            });
            if (!data.oid) {
                $main.on('click touchstart', function () {
                    // Protect against two events
                    if (vis.detectBounce(this)) {
                        return;
                    }

                    $div.popupDialog('show');
                });
            }
        }
        if (!data.oid && !data.url) {
            $main.addClass('vis-hq-main-none');
            $div.css({ cursor: 'auto' });
        }
    },
    init: function (wid, view, data, style, wType) {
        vis.binds.hqwidgets.showVersion();
        const $div = $(`#${wid}`).addClass('vis-hq-button-base');
        if (!$div.length) {
            setTimeout(
                (_wid, _view, _data, _style, _wType) =>
                    vis.binds.hqwidgets.button.init(_wid, _view, _data, _style, _wType),
                100,
                wid,
                view,
                data,
                style,
                wType,
            );
            return;
        }
        const _data = { wid, view, wType };
        for (const a in data) {
            if (!data.hasOwnProperty(a) || typeof data[a] === 'function') {
                continue;
            }
            if (a[0] !== '_') {
                _data[a] = data[a];
            }
        }
        data = _data;

        if (!data.wType) {
            if (data.min === undefined || data.min === null || data.min === '') {
                data.min = false;
            }
            if (data.max === undefined || data.max === null || data.max === '') {
                data.max = true;
            }
        }

        data.styleNormal = data.usejQueryStyle ? 'ui-state-default' : data.styleNormal || 'vis-hq-button-base-normal';
        data.styleActive = data.usejQueryStyle ? 'ui-state-active' : data.styleActive || 'vis-hq-button-base-on';
        data.digits = data.digits || data.digits === 0 ? parseInt(data.digits, 10) : null;
        if (typeof data.step === 'string') {
            data.step = data.step.replace(',', '.');
        }
        data.step = parseFloat(data.step || 1);
        data.is_comma = data.is_comma === 'true' || data.is_comma === true;
        data.readOnly = data.readOnly === 'true' || data.readOnly === true;
        data.midTextColor = data.midTextColor || '';
        data.infoColor = data.infoColor || '';
        data.infoBackground = data.infoBackground || 'rgba(182,182,182,0.6)';
        data.pushButton = data.pushButton === 'true' || data.pushButton === true;

        if (data.wType === 'number') {
            data.min =
                data.min === 'true' || data.min === true
                    ? true
                    : data.min === 'false' || data.min === false
                      ? false
                      : data.min !== undefined && data.min !== null
                        ? parseFloat(data.min)
                        : 0;
            data.max =
                data.max === 'true' || data.max === true
                    ? true
                    : data.max === 'false' || data.max === false
                      ? false
                      : data.max !== undefined && data.max !== null
                        ? parseFloat(data.max)
                        : 100;
        } else {
            data.min =
                data.min === 'true' || data.min === true
                    ? true
                    : data.min === 'false' || data.min === false
                      ? false
                      : data.min !== undefined && data.min !== null && data.min !== ''
                        ? data.min
                        : 0;
            data.max =
                data.max === 'true' || data.max === true
                    ? true
                    : data.max === 'false' || data.max === false
                      ? false
                      : data.max !== undefined && data.max !== null && data.max !== ''
                        ? data.max
                        : 100;
        }
        $div.data('data', data);
        $div.data('style', style);

        if (data.oid) {
            data.value = vis.states.attr(`${data.oid}.val`);
            data.ack = vis.states.attr(`${data.oid}.ack`);
            data.lc = vis.states.attr(`${data.oid}.lc`);
        }

        if (data['oid-working']) {
            data.working = vis.states.attr(`${data['oid-working']}.val`);
        }
        if (data['oid-battery']) {
            data.battery = vis.states.attr(`${data['oid-battery']}.val`);
        }
        if (data['oid-signal']) {
            data.signal = vis.states.attr(`${data['oid-signal']}.val`);
        }
        if (data['oid-humidity']) {
            data.humidity = vis.states.attr(`${data['oid-humidity']}.val`);
        }
        if (data['oid-actual']) {
            data.actual = vis.states.attr(`${data['oid-actual']}.val`);
        }
        if (data['oid-drive']) {
            let val = vis.states.attr(`${data['oid-drive']}.val`);
            if (val === null || val === undefined) {
                val = 0;
            }
            if (data.valveBinary === 'true' || data.valveBinary === true) {
                if (val === 'true') {
                    val = true;
                } else if (parseFloat(val).toString() === val.toString()) {
                    val = !!parseFloat(val);
                } else if (val === 'false') {
                    val = false;
                }
                val = val ? _('opened') : _('closed');
            } else if (data.valve1 === 'true' || data.valve1 === true) {
                // the value is from 0 to 1.01
                val = Math.round((parseFloat(val) || 0) * 100);
                if (val < 0) {
                    val = 0;
                } else if (val > 100) {
                    val = 100;
                }
            } else {
                val = Math.round(parseFloat(val) || 0);
            }

            data.drive = val;
        }

        vis.binds.hqwidgets.button.draw($div);
    },
};
