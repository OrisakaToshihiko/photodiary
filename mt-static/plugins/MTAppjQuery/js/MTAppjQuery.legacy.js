/*
 * MTAppjQuery.legacy.js
 *
 * Copyright (c) Tomohiro Okuwaki (http://bit-part/)
 *
 * Since:   2010/06/22
 * Update:  2020/08/17
 *
 */
'use strict';

(function($){

    if (typeof mtappVars !== 'object') return;

    // カテゴリの変更を監視する
    const categoryIds = document.getElementById('category-ids');
    if (categoryIds) {

    }
    // ---------------------------------------------------------------------
    //  $(foo).MTAppAssetFields();
    // ---------------------------------------------------------------------
    //                                             Latest update: 2018/09/05
    //                                             Thanks To: BUN
    //
    //  input:text で MT 標準の「アイテム」ダイアログを利用できるようにします。
    //  id, filename, url, thumnail(imageのみ)の値を JSON で保存します。
    // ---------------------------------------------------------------------
    $.fn.MTAppAssetFields = function(options, words){
        var op = $.extend({}, $.fn.MTAppAssetFields.defaults, options);

        var language = mtappVars.language === 'ja' ? 'ja' : 'en';
        var words = words || {};
        var l10n = $.extend({}, $.fn.MTAppAssetFields.l10n[language], words);

        // フィールド保存用スクリプト（MT標準のスクリプト）
        var insertScriptHTML = [
            '<scr' + 'ipt type="text/javascript">',
            'function insertCustomFieldAsset(html, id, preview_html) {',
            '    getByID(id).value = html;',
            '    if ( !preview_html )',
            '        preview_html = html ? html : \'\';',

            '    try {',
            '        /* remove the form enclosure from the preview */',
            '        var enc = document.createElement( "div" );',
            '        enc.innerHTML = preview_html;',
            '        var form = enc.getElementsByTagName( "form" )[ 0 ];',
            '        getByID(id + \'_preview\').innerHTML = form ? form.innerHTML : preview_html;',
            '    } catch(e) { ',
            '        log.error(e);',
            '    };',
            '    var remove_button = getByID(id + \'_remove_asset\');',
            '    if (remove_button && html) {',
            '        TC.removeClassName(getByID(id + \'_remove_asset\'), \'hidden\');',
            '    }',
            '    else if (remove_button) {',
            '        TC.addClassName(getByID(id + \'_remove_asset\'), \'hidden\');',
            '    }',
            '}',
            '</scr' + 'ipt>'
        ];
        $('body').append(insertScriptHTML.join(''));

        // MTAppAssetFields を適用したフィールドの ID を保存する
        if (!$('body').data('MTAppAssetFieldsIDs')) {
            $('body').data('MTAppAssetFieldsIDs',[]);
        }

        // 保存時に form タグを置換する
        var MTAppAssetFieldsSubmit = function(){
            var ids = $('body').data('MTAppAssetFieldsIDs');
            for (let i = 0, l = ids.length; i < l; i++) {
                $('#' + ids[i]).not('.no-convert').trigger('convert');
            }
            return true;
        };
        this.closest('form').off('submit.MTAppAssetFieldsSubmit').on('submit.MTAppAssetFieldsSubmit', MTAppAssetFieldsSubmit);

        return this.each(function(){
            var $this = $(this);
            if (!op.debug) {
                $this.hide();
            }
            if (op.noConvert) {
                $this.addClass('no-convert');
            }
            if ($this.hasClass('isMTAppAssetFields')) {
                return;
            } else {
                $this.addClass('isMTAppAssetFields');
            }

            // フィールドの値を data() でセット
            $this.data('MTAppAssetFieldsValue', $this.val());

            // 要素のidを取得。ない場合はTemporary idを作成
            var thisId = $this.attr('id') || mtapp.temporaryId('temp-');
            thisId = 'customfield_mtappassetfields_' + thisId;

            // id を body の data に保存
            var bodyData = $('body').data('MTAppAssetFieldsIDs');
            bodyData.push(thisId);

            $this.attr('id', thisId);

            // JSON から HTML を作成
            $this.on('refreshHTML', function(ev, type){
                // 二重適用を防ぐ
                $this.nextAll('div.MTAppAssetFields').remove();
                // アイテム用 HTML を作成
                var assetTypeLabel = '';
                if (op.assetTypeLabel !== '') {
                    assetTypeLabel = op.assetTypeLabel;
                } else {
                    assetTypeLabel = l10n[op.assetType];
                }
                // 保存されている値を取得(JSON)
                var json = $this.val();
                if (json) {
                    try {
                        json = JSON.parse(json);
                    }
                    catch(e) {
                        alert(e.message);
                    }
                }
                var itemThumbHTML = '';
                var removeLinkHidden = 'hidden'
                if (json.url) {
                    if (op.assetType === 'image') {
                        if (type === 'force' && typeof json.thumbnail === 'undefined' && typeof mtappVars.DataAPI === 'object') {
                            var tempImgId = mtapp.temporaryId('temp-');
                            itemThumbHTML = '<a href="' + json.url + '" target="_blank"><img id="' + tempImgId + '" src="" alt="" style="display: none;"></a>';
                            (function(tempImgId, $this){
                                mtappVars.DataAPI.getThumbnail(mtappVars.blog_id, json.id, { width: 240, height: 240 }, function(response){
                                    var thumbnail = response.url;
                                    $('#' + tempImgId).attr('src', thumbnail).fadeIn();
                                    var replacement = ',"thumbnail":"' + thumbnail +'"}';
                                    var value = $this.val().replace(/\}$/, replacement);
                                    $this.val(value);
                                });
                            })(tempImgId, $this);
                        }
                        else if (json.thumbnail) {
                            itemThumbHTML = '<a href="' + json.url + '" target="_blank"><img src="' + json.thumbnail + '" alt=""></a>';
                        }
                        else {
                            itemThumbHTML = '<a href="' + json.url + '" target="_blank"><img src="' + json.url + '" alt=""></a>';
                        }
                    } else if (op.assetType === 'file' || op.assetType === 'audio') {
                        itemThumbHTML = '<a href="' + json.url + '" target="_blank">' + json.filename + '</a>';
                    }
                    removeLinkHidden = '';
                }
                var canMulti = op.canMulti ? '&amp;can_multi=1' : '';
                var html = [
                    '<div id="' + thisId +'_preview" class="customfield_preview MTAppAssetFields">',
                        itemThumbHTML,
                    '</div>',
                    '<div class="actions-bar MTAppAssetFields" style="clear: none;">',
                        '<div class="actions-bar-inner pkg actions">',
                            '<a href="' + ScriptURI + '?__mode=list_asset&amp;_type=asset&amp;blog_id=' + mtappVars.blog_id + '&amp;dialog_view=1&amp;filter=class&amp;filter_val=' + op.assetType + '&amp;require_type=' + op.assetType + '&amp;edit_field=' + thisId + canMulti + '&amp;asset_select=1" class="btn btn-default mt-2 mt-open-dialog mt-modal-open mtapp-open-modal" data-mt-modal-large>',
                                assetTypeLabel + l10n.select,
                            '</a>',
                            '<a href="#" id="' + thisId +'_remove_asset" class="btn btn-default mt-2 ml-2' + removeLinkHidden + '" onclick="insertCustomFieldAsset(\'\', \'' + thisId +'\'); return false;">',
                                assetTypeLabel + l10n.remove,
                            '</a>',
                      '</div>',
                    '</div>'
                ].join('');
                // アイテム用 HTML を挿入
                $this.after(html);
            });

            // 初回の実行
            $this.trigger('refreshHTML');


            // モーダルを開くリンクにイベントを設定
            $this.next().next().find('.mtapp-open-modal').mtModal();

            // <form> を JSON に変換するイベントを設定
            $this.on('convert', function(){
                var $self = $(this);
                var value = $self.val();
                if (/<form mt:asset-id/.test(value)) {
                    value = value.replace(/<form mt:asset-id="(\d+)".+?href="([^"]+)">([^<]+).+/gi, '{"id":"$1","filename":"$3","url":"$2"}');
                    var $customfieldPreviewImage = $self.next().find('img');
                    if ($customfieldPreviewImage.length > 0) {
                        var thumbURL = $customfieldPreviewImage.attr('src');
                        value = value.replace(/\}$/, ',"thumbnail":' + '"' + thumbURL + '"}');
                    }
                    $self.val(value);
                    if ($self.hasClass('jsontable-input')) {
                        $self.closest('div.mtapp-json-table').prev().trigger('MTAppJSONTableSave');
                    }
                }
            });
            return true;
        });
    };
    $.fn.MTAppAssetFields.l10n = {
      en: {
          image: 'Image',
          file: 'File',
          audio: 'Audio',
          select: ' Select',
          remove: ' Remove'
      },
      ja: {
          image: '画像',
          file: 'ファイル',
          audio: 'オーディオ',
          select: 'を選択',
          remove: 'を削除'
      }
    };
    $.fn.MTAppAssetFields.defaults = {
        // You can set either 'image', 'file' or 'audio'
        assetType: 'image',
        // Set a text of <a> tag if you want to change.
        assetTypeLabel: '',
        // If set to true, you can edit images in a dialog.
        edit: false,
        // If set to true, transforming form into JSON is disabled when object is saved.
        noConvert: false,
        // If set to true, you can upload multiple files at one time.
        canMulti: false,
        // If set to true, the original field is shown.
        debug: false
    };
    // end - $.MTAppAssetFields();


    // ---------------------------------------------------------------------
    //  $(foo).MTAppJSONTable();
    // ---------------------------------------------------------------------
    //                                             Latest update: 2018/06/06
    //
    //  textareaを表形式の入力欄にし、表に入力された値をJSONで元のtextareaに保存します。
    //  このメソッドで扱えるJSONのフォーマットは下記の通りです。
    //  {"items":[
    //      {"key1": "value1", "key2": "value2", "key3": "value3"},
    //      {"key1": "value1", "key2": "value2", "key3": "value3"},
    //      {"key1": "value1", "key2": "value2", "key3": "value3"}
    //  ]}
    // ---------------------------------------------------------------------
    $.fn.MTAppJSONTable = function(options){
        const op = $.extend({
          inputType: 'textarea', // 'textarea' or 'input'
          caption: null, // String: Table caption
          header: null, // Object: Table header
          headerOrder: [], // Array: Order of table header
          headerPosition: 'top', // 'top' or 'left'
          footer: false, // If you use the table footer, set true.
          items: null, // Array include Object
          itemsRootKey: 'items', // String: The root key of items
          edit: true, // Disable table
          add: false, // true: A user can add rows or columns.
          clear: true, // false: Hide a delete button.
          cellMerge: false,
          sortable: false,
          listingCheckbox: false, // or true
          listingCheckboxType: 'checkbox', // or 'radio'
          listingTargetKey: null, // String: Target key  which is saved value when listing mode is applied
          listingTargetEscape: false, // Boolean: encodeURIComponent(target value)
          optionButtons: null, // [{classname:"classname", text:"button text"}]
          // Callbacks
          cbAfterBuildSystem: null, // function({name: 'cbAfterBuild'}, $container){}
          cbAfterBuild: null, // function({name: 'cbAfterBuild'}, $container){}
          cbBeforeAdd: null, // function({name: 'cbBeforeAdd', type: 'column'}, $td){}
          cbAfterAddSystem: null, // function({name: 'cbAfterAdd', type: 'row or column'}, $container){}
          cbAfterAdd: null, // function({name: 'cbAfterAdd', type: 'row or column'}, $container){}
          cbBeforeClear: null, // function({name: 'cbAfterAdd'}, $container){}
          cbAfterSelectRow: null, // function({name: 'cbAfterSelectRow'}, $tr, $(this).is(':checked')){}
          cbAfterSelectColumn: null, // function({name: 'cbAfterSelectColumn'}, $td, $(this).is(':checked')){}
          cbBeforeSave: null, // function({name: 'cbBeforeSave'}, $container, $this){}
          cbAfterSave: null, // function({name: 'cbAfterSave'}, $container, $this, savedJSON){}

          nest: false, // backward compatible
          debug: false // true: show the original textarea.
        }, options);

        const l10n = {};
        if (mtappVars.language === 'ja') {
            l10n.addRow = '行を追加';
            l10n.addColumn = '列を追加';
            l10n.clearData = '削除';
            l10n.showJSON = 'JSONを表示';
            l10n.hideJSON = 'JSONを非表示';
            l10n.debugMessage = 'フィールドが表示されているときはテーブル内の値は無視され、フィールド内の JSON がそのまま保存されます。';
            l10n.checkSyntax = 'JSONの文法をチェック';
            l10n.addColumnProperty = 'プロパティ名（例：title）';
            l10n.addColumnPropertyDisplayName = 'プロパティ表示名（例：タイトル）';
            l10n.cellMerge = 'セルを結合';
            l10n.cellMergeApply = '結合を適用';
            l10n.colspanValueIs = '結合する列の数';
            l10n.rowspanValueIs = '結合する行の数';
            l10n.failedSelect = '連続したセルを選択してください';
        }
        else {
            l10n.addRow = 'Add a row';
            l10n.addColumn = 'Add a column';
            l10n.clearData = 'Delete';
            l10n.showJSON = 'Show JSON';
            l10n.hideJSON = 'Hide JSON';
            l10n.debugMessage = 'When the field is visible, ignore table values and save JSON.';
            l10n.checkSyntax = 'Check JSON syntax';
            l10n.addColumnProperty = 'Property Name (e.g. title)';
            l10n.addColumnPropertyDisplayName = 'Property Display Name (e.g. Title)';
            l10n.cellMerge = 'Merge cells';
            l10n.cellMergeApply = 'Apply merge';
            l10n.colspanValueIs = 'The value of colspan:';
            l10n.rowspanValueIs = 'The value of rowspan:';
            l10n.failedSelect = 'Failed to select';
        }

        // Auto settings
        if (op.clear) {
            op.listingCheckbox = true;
        }

        return this.each(function(){

            // Check the headerOrder of properties
            const order = op.headerOrder;
            if ($.isArray(order) && order.length === 0) {
                alert('Error in .MTAppJSONTable: The "headerOrder" option is required.');
                return;
            }

            const $this = $(this);
            $this.addClass('hidden').css({
                marginBottom: '10px'
            });

            const jsonStr = $this.val();
            let json = null;
            if (/^\{/.test(jsonStr)) {
                try {
                    json = JSON.parse(jsonStr);
                }
                catch(e) {
                    alert(e.message);
                }
            }
            else {
                if (op.items === null) {
                    json = {};
                    json[op.itemsRootKey] = [];
                }
                else {
                    json = op.items;
                }
            }
            if (json === null) {
                return;
            }

            const items = json[op.itemsRootKey];
            if (items.length === 0) {
                items[0] = {};
                for (let i = 0, l = order.length; i < l; i++) {
                    items[0][order[i]] = '';
                }
            }

            // Merge headerOrder to JSON
            if (!op.cellMerge) {
                for (let i = 0, l = order.length; i < l; i++) {
                    for (let x = 0, y = items.length; x < y; x++) {
                        if (!items[x].hasOwnProperty(order[i])) {
                            items[x][order[i]] = '';
                        }
                    }
                }

            }

            // XSS対策
            for (let i = 0, l = items.length; i < l; i++) {
                for (let prop in items[i]) {
                    if (typeof items[i][prop] === 'string') {
                        items[i][prop] = items[i][prop].encodeHTML();
                    }
                    else if (typeof items[i][prop] === 'object') {
                        items[i][prop] = JSON.stringify(items[i][prop]);
                    }
                }
            }

            op.items = items;

            let itemLength = op.items.length;
            const tmpl = {};

            tmpl.caption = '<caption>[#= caption #]</caption>';

            tmpl.header = [
                '<thead>',
                  '<tr>',
                      '[# if (sortable) { #]',
                      '<th class="jsontable-sort-handle">&nbsp;</th>',
                      '[# } #]',
                      // op.clear == true
                      '[# if (listingCheckbox) { #]',
                      '<th class="jsontable-cb-cell">&nbsp;</th>',
                      '[# } #]',
                      '[# for (let i = 0, l = headerOrder.length; i < l; i++) { #]',
                      '<th class="[#= headerOrder[i] #]" data-name="[#= headerOrder[i] #]">[#= header[headerOrder[i]] #]</th>',
                      '[# } #]',
                  '</tr>',
                '</thead>'
            ].join("\n");

            tmpl.footer = [
                '<tfoot>',
                  '<tr>',
                      '[# if (sortable) { #]',
                      '<th class="mt-table-thead-th jsontable-sort-handle">&nbsp;</th>',
                      '[# } #]',
                      '[# if (listingCheckbox) { #]',
                      '<th class="mt-table-thead-th jsontable-cb-cell">&nbsp;</th>',
                      '[# } #]',
                      '[# for (let i = 0, l = headerOrder.length; i < l; i++) { #]',
                      '<th class="mt-table-thead-th [#= headerOrder[i] #]" data-name="[#= headerOrder[i] #]">[#= header[headerOrder[i]] #]</th>',
                      '[# } #]',
                  '</tr>',
                '</tfoot>'
            ].join("\n");

            tmpl.tbodyTopPlain = [
                '<tr class="odd">',
                    '[# if (sortable) { #]',
                    '<td class="jsontable-sort-handle"><svg role="img" title="移動" class="mt-icon"><use xlink:href="' + mtappVars.static_path + 'images/sprite.svg#ic_move"></use></svg></td>',
                    '[# } #]',
                    '[# if (listingCheckbox) { #]',
                    '<td class="jsontable-cb-cell">',
                        '[# if (listingCheckboxType === "radio") { #]',
                        '<input type="radio" name="jsontable-radio" class="jsontable-cb">',
                        '[# } else { #]',
                        '<input type="checkbox" class="jsontable-cb">',
                        '[# } #]',
                    '</td>',
                    '[# } #]',
                    '[# for (let x = 0, y = headerOrder.length; x < y; x++) { #]',
                    '<td class="[#= headerOrder[x] #]" data-name="[#= headerOrder[x] #]">',
                        '[# if (inputType === "input" || (inputType === "object" && inputTypeObj[headerOrder[x]] && inputTypeObj[headerOrder[x]] === "input") ) { #]',
                            '<input class="form-control jsontable-input" type="text" data-name="[#= headerOrder[x] #]" value="">',
                        '[# } else if (inputType === "textarea" || (inputType === "object" && inputTypeObj[headerOrder[x]] && inputTypeObj[headerOrder[x]] === "textarea") ) { #]',
                            '<textarea class="form-control jsontable-input" data-name="[#= headerOrder[x] #]"></textarea>',
                        '[# } #]',
                    '</td>',
                    '[# } #]',
                '</tr>'
            ].join("");

            tmpl.tbodyTop = [
                '<tbody class="jsontable-tbody">',
                    '[# for (let i = 0, l = items.length; i < l; i++) { #]',
                    '[# if (i % 2 === 0) { #]',
                    '<tr class="even">',
                    '[# } else { #]',
                    '<tr class="odd">',
                    '[# } #]',
                        '[# if (sortable) { #]',
                        '<td class="jsontable-sort-handle"><svg role="img" title="移動" class="mt-icon"><use xlink:href="' + mtappVars.static_path + 'images/sprite.svg#ic_move"></use></svg></td>',
                        '[# } #]',
                        '[# if (listingCheckbox) { #]',
                        '<td class="jsontable-cb-cell">',
                            '[# if (listingCheckboxType === "radio") { #]',
                            '<input type="radio" name="jsontable-radio" class="jsontable-cb">',
                            '[# } else { #]',
                            '<input type="checkbox" class="jsontable-cb">',
                            '[# } #]',
                        '</td>',
                        '[# } #]',
                        '[# for (let x = 0, y = headerOrder.length; x < y; x++) { #]',
                            '[# if (!items[i].hasOwnProperty(headerOrder[x])) { continue; } #]',
                        '<td class="[#= headerOrder[x] #]" data-name="[#= headerOrder[x] #]"',
                            '[# if (listingTargetKey && listingTargetKey === headerOrder[x]) { #]',
                                '[# if (listingTargetEscape) { #]',
                                 'data-value="[#= encodeURIComponent(items[i][headerOrder[x]]) #]"',
                                 '[# } else { #]',
                                 'data-value="[#= items[i][headerOrder[x]] #]"',
                                 '[# } #]',
                             '[# } #]',
                             // Cell Merge
                             '[# if (items[i].hasOwnProperty(headerOrder[x] + "_colspan")) { #]',
                                'colspan="[#= items[i][headerOrder[x] + "_colspan"] #]"',
                             '[# } #]',
                             '[# if (items[i].hasOwnProperty(headerOrder[x] + "_rowspan")) { #]',
                                'rowspan="[#= items[i][headerOrder[x] + "_rowspan"] #]"',
                             '[# } #]',
                        '>',
                            '[# if (edit) { #]',
                                '[# if (inputType === "input" || (inputType === "object" && inputTypeObj[headerOrder[x]] && inputTypeObj[headerOrder[x]] === "input") ) { #]',
                                    '<input class="form-control jsontable-input" type="text" data-name="[#= headerOrder[x] #]" value="[#= items[i][headerOrder[x]] #]">',
                                '[# } else if (inputType === "textarea" || (inputType === "object" && inputTypeObj[headerOrder[x]] && inputTypeObj[headerOrder[x]] === "textarea") ) { #]',
                                    '<textarea class="form-control jsontable-input" data-name="[#= headerOrder[x] #]">[#= items[i][headerOrder[x]] #]</textarea>',
                                '[# } #]',
                            '[# } else { #]',
                                '<span class="jsontable-input-data">[#= items[i][headerOrder[x]] #]</span>',
                                '[# if (listingTargetKey && listingTargetKey === headerOrder[x]) { #]',
                                    '<textarea class="form-control jsontable-input-hidden hidden" data-name="[#= headerOrder[x] #]">[#= items[i][headerOrder[x]] #]</textarea>',
                                '[# } #]',
                            '[# } #]',
                        '</td>',
                        '[# } #]',
                    '</tr>',
                    '[# } #]',
                '</tbody>'
            ].join("");

            tmpl.tbodyLeftPlain = [
                '<td class="[#= headerOrder #] item-[#= i #] last-child" data-item-index="[#= i #]" data-name="[#= headerOrder #]">',
                    '[# if (inputType === "input" || (inputType === "object" && inputTypeObj[headerOrder] && inputTypeObj[headerOrder] === "input") ) { #]',
                        '<input class="form-control jsontable-input" type="text" data-name="[#= headerOrder #]" value="">',
                    '[# } else if (inputType === "textarea" || (inputType === "object" && inputTypeObj[headerOrder] && inputTypeObj[headerOrder] === "textarea") ) { #]',
                        '<textarea class="form-control jsontable-input" data-name="[#= headerOrder #]"></textarea>',
                    '[# } #]',
                '</td>'
            ].join("");

            tmpl.tbodyLeft = [
                '<tbody class="jsontable-tbody">',
                    '[# if (listingCheckbox) { #]',
                    '<tr class="jsontable-clear-row">',
                        '[# if (header) { #]',
                        '<th class="mt-table-thead-th jsontable-cb-cell">&nbsp;</th>',
                        '[# } #]',
                        '[# for (let i = 0, l = items.length; i < l; i++) { #]',
                        '<td class="jsontable-cb-cell item-[#= i #]" data-item-index="[#= i #]">',
                            '<input type="checkbox" class="jsontable-cb">',
                        '</td>',
                        '[# } #]',
                    '</tr>',
                    '[# } #]',
                    '[# for (let x = 0, y = headerOrder.length; x < y; x++) { #]',
                    '<tr class="[#= headerOrder[x] #]" data-name="[#= headerOrder[x] #]">',
                        '[# for (let i = 0, l = items.length; i < l; i++) { #]',
                            '[# if (!items[i].hasOwnProperty(headerOrder[x])) { continue; } #]',
                        '<td class="[#= headerOrder[x] #] item-[#= i #]" data-item-index="[#= i #]" data-name="[#= headerOrder[x] #]"',
                            // Cell Merge
                            '[# if (items[i].hasOwnProperty(headerOrder[x] + "_colspan")) { #]',
                               'colspan="[#= items[i][headerOrder[x] + "_colspan"] #]"',
                            '[# } #]',
                            '[# if (items[i].hasOwnProperty(headerOrder[x] + "_rowspan")) { #]',
                               'rowspan="[#= items[i][headerOrder[x] + "_rowspan"] #]"',
                            '[# } #]',
                        '>',
                            '[# if (edit) { #]',
                                '[# if (inputType === "input" || (inputType === "object" && inputTypeObj[headerOrder[x]] && inputTypeObj[headerOrder[x]] === "input") ) { #]',
                                    '<input class="form-control jsontable-input" type="text" data-name="[#= headerOrder[x] #]" value="[#= items[i][headerOrder[x]] #]">',
                                '[# } else if (inputType === "textarea" || (inputType === "object" && inputTypeObj[headerOrder[x]] && inputTypeObj[headerOrder[x]] === "textarea") ) { #]',
                                    '<textarea class="form-control jsontable-input" data-name="[#= headerOrder[x] #]">[#= items[i][headerOrder[x]] #]</textarea>',
                                '[# } #]',
                            '[# } else { #]',
                                '<span class="jsontable-input-data">[#= items[i][headerOrder[x]] #]</span>',
                                '[# if (listingTargetKey && listingTargetKey === headerOrder[x]) { #]',
                                    '<textarea class="form-control jsontable-input-hidden hidden" data-name="[#= headerOrder[x] #]">[#= items[i][headerOrder[x]] #]</textarea>',
                                '[# } #]',
                            '[# } #]',
                        '</td>',
                        '[# } #]',
                    '</tr>',
                    '[# } #]',
                '</tbody>'
            ].join("");

            tmpl.buttons = [
                '<div class="add-btn text-right">',
                    '[# if (add && headerPosition === "top") { #]',
                    '<a href="#" class="btn btn-default ml-2 jsontable-add jsontable-add-row">' + l10n.addRow + '</a>',
                    '[# } #]',
                    '[# if (add && headerPosition === "left") { #]',
                    '<a href="#" class="btn btn-default ml-2 jsontable-add jsontable-add-column">' + l10n.addColumn + '</a>',
                    '[# } #]',
                    '[# if (cellMerge) { #]',
                    '<a href="#" class="btn ml-2 btn-warning jsontable-cellMerge">' + l10n.cellMerge + '</a>',
                    '[# } #]',
                    '[# if (clear) { #]',
                    '<a href="#" class="btn btn-danger ml-2 jsontable-clear">' + l10n.clearData + '</a>',
                    '[# } #]',
                    '[# if (debug) { #]',
                    '<a href="#" class="btn ml-2 btn-success jsontable-debug">' + l10n.showJSON + '</a>',
                    '<a href="#" class="btn ml-2 btn-info jsontable-check-json primary hidden">' + l10n.checkSyntax + '</a>',
                    '[# } #]',
                    '[# if (optionButtons) { #]',
                        '[# for (let i = 0, l = optionButtons.length; i < l; i++) { #]',
                        '<a href="#" class="btn btn-default ml-2 [#= optionButtons[i].classname #]">[#= optionButtons[i].text #]</a>',
                        '[# } #]',
                    '[# } #]',
                '</div>'
            ].join("");

            tmpl.debugMessage = [
                '<div class="alert alert-warning jsontable-debug-message hidden">' + l10n.debugMessage + '</div>'
            ].join("");

            tmpl.container = [
                '<div class="mtapp-json-table">',
                    '<table class="table table-bordered mt-table  jsontable-table">',
                        // caption
                        '[# if (typeof caption === "string") { #]',
                            '[#= context.include("caption") #]',
                        '[# } #]',

                        // header
                        '[# if (header && headerPosition === "top") { #]',
                            '[#= context.include("header") #]',
                        '[# } #]',

                        // footer
                        '[# if (header && headerPosition === "top" && footer) { #]',
                            '[#= context.include("footer") #]',
                        '[# } #]',

                        // tbody
                        '[# if (items.length > 0) { #]',
                            '[# if (headerPosition === "top") { #]',
                                '[#= context.include("tbodyTop") #]',
                            '[# } else if (headerPosition === "left") { #]',
                                '[#= context.include("tbodyLeft") #]',
                            '[# } #]',
                        '[# } #]',

                    '</table>',

                    '[# if (add || clear || optionButtons || debug) { #]',
                        '[#= context.include("buttons") #]',
                    '[# } #]',

                '</div>'
            ].join("\n");

            // Build HTML and insert a table.
            if ($.type(op.inputType) === 'object') {
                op.inputTypeObj = op.inputType;
                op.inputType = 'object';
            }

            const tableHtml = Template.process('container', op, tmpl);
            $(this).after(tableHtml);

            const $container = $this.next('div');
            const $table = $container.children('table');
            $table.data('item-length', itemLength);

            // If the "headerPosition" option is "left", insert th to tr.
            if (op.header && op.headerPosition === 'left') {
                $table.find('tr').not('.jsontable-clear-row').each(function(){
                    const dataName = $(this).attr('data-name');
                    $(this).prepend('<th class="mt-table-thead-th ' + dataName + '" data-name="' + dataName + '">' + op.header[dataName] + '</th>');
                });
            }

            // Click checkboxes for deleting data
            if (op.listingCheckbox) {
                if (op.headerPosition === 'top') {
                    $table.on('click', 'input.jsontable-cb', function(){
                        const $tr = $(this).parent().parent().toggleClass('jsontable-selected-data');
                        if (op.cbAfterSelectRow !== null && typeof op.cbAfterSelectRow === 'function') {
                            op.cbAfterSelectRow({name: 'cbAfterSelectRow'}, $tr, $(this).is(':checked'));
                        }
                    });
                }
                else if (op.headerPosition === 'left') {
                    $table.on('click', 'input.jsontable-cb', function(){
                        const itemIndex = $(this).parent().attr('data-item-index');
                        const $td = $table.find('.item-' + itemIndex).toggleClass('jsontable-selected-data');
                        if (op.cbAfterSelectColumn !== null && typeof op.cbAfterSelectColumn === 'function') {
                            op.cbAfterSelectColumn({name: 'cbAfterSelectColumn'}, $td, $(this).is(':checked'));
                        }
                    });
                }
            }

            // Add a row or column
            if (op.add || op.clear) {
                $container.on('click', 'div.add-btn a', function(){
                    if ($(this).hasClass('jsontable-add-row')) {
                        const plainTr = Template.process('tbodyTopPlain', op, tmpl);
                        if (op.cbBeforeAdd !== null && typeof op.cbBeforeAdd === 'function') {
                            op.cbBeforeAdd({name: 'cbBeforeAdd', type: 'row'}, $container);
                        }
                        $table.find('tbody.jsontable-tbody').append(plainTr);
                        if (op.cbAfterAddSystem !== null && typeof op.cbAfterAddSystem === 'function') {
                            op.cbAfterAddSystem({name: 'cbAfterAddSystem', type: 'row'}, $container);
                        }
                        if (op.cbAfterAdd !== null && typeof op.cbAfterAdd === 'function') {
                            op.cbAfterAdd({name: 'cbAfterAdd', type: 'row'}, $container);
                        }
                    }
                    else if ($(this).hasClass('jsontable-add-column')) {
                        const headerOrderClone = $.extend(true, [], op.headerOrder);
                        // $table.find('td:last-child').each(function(){
                        //     var idx = $(this).index();
                        //     if (idx > dataItemIndex) {
                        //         dataItemIndex = idx;
                        //     }
                        // });
                        $table.find('tr').each(function(){
                            let $td = $(this).children(':last-child').removeClass('last-child').clone().removeClass(function(index, classname) {
                                return (classname.match(/\bitem-\d+/g) || []).join(' ');
                            });
                            if ($(this).hasClass('jsontable-clear-row')) {
                                $td.attr('data-item-index', itemLength).addClass('item-' + itemLength);
                            }
                            else {
                                var data = {
                                    headerOrder: headerOrderClone.shift(),
                                    inputType: op.inputType,
                                    inputTypeObj: op.inputTypeObj,
                                    i: itemLength
                                };
                                $td = Template.process('tbodyLeftPlain', data, tmpl);
                            }
                            if (op.cbBeforeAdd !== null && typeof op.cbBeforeAdd === 'function') {
                                op.cbBeforeAdd({name: 'cbBeforeAdd', type: 'column'}, $td);
                            }
                            $(this).append($td);
                        });
                        itemLength++;
                        $table.data('item-length', itemLength);
                        if (op.cbAfterAddSystem !== null && typeof op.cbAfterAddSystem === 'function') {
                            op.cbAfterAddSystem({name: 'cbAfterAddSystem', type: 'column'}, $container);
                        }
                        if (op.cbAfterAdd !== null && typeof op.cbAfterAdd === 'function') {
                            op.cbAfterAdd({name: 'cbAfterAdd', type: 'column'}, $container);
                        }
                    }
                    else if ($(this).hasClass('jsontable-clear')) {
                        if (op.cbBeforeClear !== null && typeof op.cbBeforeClear === 'function') {
                            op.cbBeforeClear({name: 'cbBeforeClear'}, $container);
                        }
                        $table.find('.jsontable-selected-data').remove();
                        if (op.headerPosition === 'left') {
                            itemLength--;
                            $table.data('item-length', itemLength);
                        }
                    }
                    return false;
                });
            }

            if (op.cellMerge) {
                $container.on('click', 'a.jsontable-cellMerge', function(){
                    $(this).toggleClass('primary');
                    var firstSelect = true;
                    var selectMergedCell = function(e){
                        var $td = $(this);
                        var $tr = $td.parent();
                        var tdIndex = $td.index();
                        $td.toggleClass('merge-target');
                        firstSelect = false;
                    };
                    // Select merged cells
                    if ($(this).hasClass('primary')) {
                        // Clear classes
                        $table.find('td.merge-target').removeClass('merge-target');
                        $(this).text(l10n.cellMergeApply);
                        $table.on('click', 'td', selectMergedCell);
                    }
                    // Apply merge
                    else {
                        $(this).text(l10n.cellMerge);
                        $table.off('click', 'td');
                        var $mergeTarget = $table.find('td.merge-target');
                        var firstCell = {}, firstLine = {}, firstLineLastCell = {},
                            lastCell  = {}, lastLine  = {};
                        firstCell.obj = $mergeTarget.first();
                        firstCell.idx = firstCell.obj.index();
                        firstLine.obj = firstCell.obj.parent();
                        firstLine.idx = firstLine.obj.index();
                        firstLineLastCell.obj = firstLine.obj.children('.merge-target').last();
                        firstLineLastCell.idx = firstLineLastCell.obj.index();
                        lastCell.obj = $mergeTarget.last();
                        lastCell.idx = lastCell.obj.index();
                        lastLine.obj = lastCell.obj.parent();
                        lastLine.idx = lastLine.obj.index();
                        var colspan = firstLine.obj.children('.merge-target').length;
                        var rowspan = lastLine.idx - firstLine.idx + 1;
                        // Check existed colspan values
                        var existedColspan = 0;
                        firstLine.obj.children('.merge-target').filter('[colspan]').each(function(){
                            existedColspan += Number($(this).attr('colspan'));
                        });
                        if (existedColspan) {
                            colspan += (existedColspan - 1);
                        }
                        if (colspan > 1) {
                            firstCell.obj.attr('colspan', colspan);
                        }
                        if (rowspan > 1) {
                            firstCell.obj.attr('rowspan', rowspan);
                        }
                        $table.find('td.merge-target').not(':first').remove();
                    }
                    $table.toggleClass('jsontable-cell-merge');
                    return false;
                });
            }

            if (op.debug) {
                $this.before(Template.process('debugMessage', {}, tmpl));
                $container.on('click', 'a.jsontable-debug', function(){
                    if ($(this).hasClass('showed-json')) {
                        $(this).removeClass('showed-json').text(l10n.showJSON).next().addClass('hidden');
                        $this.addClass('hidden').prev().addClass('hidden');
                    }
                    else {
                        $(this).addClass('showed-json').text(l10n.hideJSON).next().removeClass('hidden');
                        $this.removeClass('hidden').prev().removeClass('hidden');
                    }
                    return false;
                });
                $container.on('click', 'a.jsontable-check-json', function(){
                    try {
                        json = JSON.parse($this.val());
                    }
                    catch(e) {
                        alert(e.message);
                        return false;
                    }
                    alert('Valid');
                    return false;
                });
            }

            // Save values edited by user
            if (op.edit) {
                $('form[method="post"]').on('submit.MTAppJSONTable', function(){
                    if ($this.is(':visible')) {
                        return true;
                    }
                    if (op.cbBeforeSave !== null && typeof op.cbBeforeSave === 'function') {
                        op.cbBeforeSave({name: 'cbBeforeSave'}, $container, $this);
                    }
                    var result = $.fn.MTAppJSONTable.save(op.headerPosition, op.itemsRootKey, $table, ':not(".hidden")', op.nest);
                    $this.val(result.replace(/^(\s|\n)+$/g, ''));
                    if (op.cbAfterSave !== null && typeof op.cbAfterSave === 'function') {
                        op.cbAfterSave({name: 'cbAfterSave'}, $container, $this, result);
                    }
                });
                $this.on('MTAppJSONTableSave', function(){
                    if (op.cbBeforeSave !== null && typeof op.cbBeforeSave === 'function') {
                        op.cbBeforeSave({name: 'cbBeforeSave'}, $container, $this);
                    }
                    var result = $.fn.MTAppJSONTable.save(op.headerPosition, op.itemsRootKey, $table, ':not(".hidden")', op.nest);
                    $this.val(result.replace(/^(\s|\n)+$/g, ''));
                    if (op.cbAfterSave !== null && typeof op.cbAfterSave === 'function') {
                        op.cbAfterSave({name: 'cbAfterSave'}, $container, $this, result);
                    }
                });
            }
            if (op.sortable && op.headerPosition === 'top') {
                $table.sortable({
                    items: 'tr',
                    handle: 'td.jsontable-sort-handle',
                    cursor: 'move'
                });
            }
            if (op.cbAfterBuildSystem !== null && typeof op.cbAfterBuildSystem === 'function') {
                op.cbAfterBuildSystem({name: 'cbAfterBuildSystem'}, $container);
            }
            if (op.cbAfterBuild !== null && typeof op.cbAfterBuild === 'function') {
                op.cbAfterBuild({name: 'cbAfterBuild'}, $container);
            }
        });
    };
    $.fn.MTAppJSONTable.save = function(headerPosition, itemsRootKey, $table, filter, nest){
        var values = '';
        var itemsArray = [];
        if (typeof filter !== 'string') {
            filter = '';
        }
        if (headerPosition === 'top') {
            $table.find('tbody.jsontable-tbody > tr' + filter).each(function(){
                var item = {};
                $(this).find('.jsontable-input').each(function(){
                    var v = $(this).val();
                    if (nest) {
                        if (/^\s*".+?"\s*$/.test(v)) {
                            v = JSON.stringify(v);
                        }
                        try {
                            v = JSON.parse(v);
                        } catch (e) {
                            // nothing to do
                        }
                    }
                    item[$(this).attr('data-name')] = v;

                    // cellMerge
                    if ($(this).parent().attr('colspan')) {
                        item[$(this).attr('data-name') + '_colspan'] = $(this).parent().attr('colspan');
                    }
                    if ($(this).parent().attr('rowspan')) {
                        item[$(this).attr('data-name') + '_rowspan'] = $(this).parent().attr('rowspan');
                    }
                    values += v;
                });
                itemsArray.push(JSON.stringify(item));
            });
        }
        else if (headerPosition === 'left') {
            var $tr = $table.find('tr' + filter);
            var itemsArrayObj = [];
            var itemLength = $table.data('item-length');
            for (let i = 0; i < itemLength; i++) {
                itemsArrayObj.push({});
            }
            $tr.each(function(i){
                $(this).find('.jsontable-input').each(function(j){
                    var v = $(this).val();
                    if (nest) {
                        if (/^\s*".+?"\s*$/.test(v)) {
                            v = JSON.stringify(v);
                        }
                        try {
                            v = JSON.parse(v);
                        } catch (e) {
                            // nothing to do
                        }
                    }
                    var idx = $(this).parent().attr('data-item-index');
                    itemsArrayObj[idx][$(this).attr('data-name')] = v;

                    // cellMerge
                    if ($(this).parent().attr('colspan')) {
                        itemsArrayObj[idx][$(this).attr('data-name') + '_colspan'] = $(this).parent().attr('colspan');
                    }
                    if ($(this).parent().attr('rowspan')) {
                        itemsArrayObj[idx][$(this).attr('data-name') + '_rowspan'] = $(this).parent().attr('rowspan');
                    }

                    values += v;
                });
            });
            for (let i = 0; i < itemLength; i++) {
                itemsArray.push(JSON.stringify(itemsArrayObj[i]));
            }
        }
        return (values !== '') ? '{"' + itemsRootKey + '":[' + itemsArray.join(',') + ']}' : '';
    };
    // end - $.fn.MTAppJSONTable()


    /**
     * Ajaxで読み込んだJSONをテーブルにしてダイアログで表示します。
     *
     * Updated: 2020/08/17
     *
     * @param options
     * @returns {*}
     * @constructor
     */
    $.fn.MTAppListing = function(options){
        const op = $.extend({}, $.fn.MTAppListing.defaults, options);
        if (typeof options.jsontable === 'object' && options.jsontable !== null) {
            op.jsontable = $.extend({}, $.fn.MTAppListing.defaults.jsontable, options.jsontable);
        }

        /* ==================================================
            L10N
        ================================================== */
        const l10n = {};
        if (mtappVars.language === 'ja') {
            l10n.title = '項目を選択';
            l10n.search = '検索';
            l10n.reset = 'リセット';
            l10n.ok = 'OK';
            l10n.cancel = 'キャンセル';
            l10n.select = '選択';
            l10n.selectedItems = '選択された項目';
            l10n.returnDialogTop = 'ダイアログのトップへ戻る';
            l10n.noItems = '該当するデータがありません';
            l10n.ajaxFail = 'データを取得できませんでした';
        }
        else {
            l10n.title = 'Select items';
            l10n.search = 'Search';
            l10n.reset = 'Reset';
            l10n.ok = 'OK';
            l10n.cancel = 'Cancel';
            l10n.select = 'Select';
            l10n.selectedItems = 'Selected items';
            l10n.returnDialogTop = 'Dialog top';
            l10n.noItems = 'A matched data was not found.';
            l10n.ajaxFail = 'An error occurred while getting data.';
        }
        if (op.l10n) {
            for (let key in op.l10n) {
                l10n[key] = op.l10n[key];
            }
        }
        /*  L10N  */

        /* ==================================================
            Template
        ================================================== */
        const tmpl = {
            dialog: [
                '<div id="[#= dialog.id #]" class="modal" tabindex="-1" role="dialog">',
                    '<div class="modal-dialog modal-lg modal-dialog-centered" role="document">',
                        '<div class="modal-content">',
                            '<div class="modal-header">',
                                '<div class="modal-title">[#= dialog.title #]</div>',
                                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
                            '</div>',
                            '<p class="text-center mtapplisting-indicator my-6"><img src="' + StaticURI + 'images/indicator.gif"></p>',
                            '<div class="modal-body hidden">',
                                '<textarea id="mtapplisting-textarea1" class="mtapplisting-dummy-textarea hidden"></textarea>',
                                '<p class="form-inline">',
                                    '<input id="mtapplisting-text-filter" type="text" class="text med form-control" value="" placeholder="' + l10n.search + '">',
                                    '<button id="mtapplisting-text-search" type="button" class="btn btn-default ml-3">' + l10n.search + '</button>',
                                    '<button id="mtapplisting-search-reset" type="button" class="btn btn-default search-reset ml-3">' + l10n.reset + '</button>',
                                '</p>',
                                '<textarea id="mtapplisting-textarea2" class="mtapplisting-dummy-textarea hidden"></textarea>',
                            '</div>',
                            '<div class="modal-footer mtapplisting-actions actions-bar">',
                                '<button type="button" id="mtapplisting-dialog-ok" class="btn btn-primary ok" data-dismiss="modal" aria-label="Ok">' + l10n.ok + '</button>',
                                '<button type="button" id="mtapplisting-dialog-cancel" class="btn btn-default" data-dismiss="modal" aria-label="Cancel">' + l10n.cancel + '</button>',
                                '<button type="button" id="mtapplisting-dialog-top" class="btn btn-default">' + l10n.returnDialogTop + '</button>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>',
                ''
          ].join('')
        };
        /*  Template  */

        /* ==================================================
            Get the MTAppLisging Dialog
        ================================================== */
        if (!$('#mtapplisting-dialog').length) {
            $('body').append('<div id="mtapplisting-dialog"></div>');
        }
        const $dialog = $('#mtapplisting-dialog');
        /*  Get the MTAppLisging Dialog  */

        /* ==================================================
            Bind events to the dialog
        ================================================== */
        if (!$dialog.hasClass('bind-event')) {
            $dialog.addClass('bind-event');
            // OK Button
            $dialog.on('click', '#mtapplisting-dialog-ok', function(e){
                const triggerId = $(e.delegateTarget).data('triggerId');
                if (!triggerId) {
                    return false;
                }

                // Save selected values
                const values = [];
                const $tbody = $('#mtapplisting-tbody1');
                const $tr = $tbody.children('tr');
                if ($tr.length) {
                    $tr.each(function(){
                        values.push($(this).find('td.' + $tbody.data('target-key') + ' textarea.jsontable-input-hidden').val());
                    });
                }
                if (values.length > 1) {
                    $('#' + triggerId).val(',' + values.join(',') + ',').trigger('change.MTAppListing');
                }
                else {
                    $('#' + triggerId).val(values[0]).trigger('change.MTAppListing');
                }

                if (op.cbAfterOK !== null && typeof op.cbAfterOK === 'function') {
                    op.cbAfterOK({name: 'cbAfterOK'}, $(e.delegateTarget), $('#' + triggerId));
                }

                // Reset trigger
                $(e.delegateTarget).data('triggerId', '');

                return false;
            });
            $dialog.on('click', '#mtapplisting-text-search', function(e){
                const v = $('#mtapplisting-text-filter').val();
                const searchWords = v.split(/[ 　]/);
                const searchWordsCount = searchWords.length;
                $('#mtapplisting-tbody2 tr').each(function(){
                    let match = 0;
                    const html = this.innerHTML;
                    for (const word of searchWords) {
                        const reg = new RegExp(word, 'i');
                        if (reg.test(html)) {
                            match++;
                        }
                        else {
                            $(this).addClass('hidden');
                            break;
                        }
                    }
                    if (match === searchWordsCount) {
                        $(this).removeClass('hidden');
                    }
                });
                if (op.cbAfterSearch !== null && typeof op.cbAfterSearch === 'function') {
                    op.cbAfterSearch({name: 'cbAfterSearch'}, $(e.delegateTarget));
                }
                return false;
            });
            $dialog.on('keypress', '#mtapplisting-text-filter', function(e){
                if (e.which == 13) {
                    $(this).next().trigger('click');
                }
            });
            $dialog.on('click', '#mtapplisting-search-reset', function(e){
                $('#mtapplisting-text-filter').val('');
                if (op.cbAfterSearchReset !== null && typeof op.cbAfterSearchReset === 'function') {
                    op.cbAfterSearchReset({name: 'cbAfterSearchReset'}, $(e.delegateTarget));
                }
                $('#mtapplisting-text-search').trigger('click');
                return false;
            });
            $dialog.on('click', '#mtapplisting-dialog-top', function(e){
                $(e.delegateTarget)
                    .find('div.modal')
                    .animate({scrollTop: 0}, 600, 'swing');
                return false;
            });
        }
        /*  Bind events to the dialog  */


        return this.each(function(){

            const $this = $(this);

            /* ==================================================
                Set IDs
            ================================================== */
            let $thisId = $this.attr('id');
            if (!$thisId) {
                $thisId = Math.floor(Math.random() * 10000000000000000).toString(36);
                $this.attr('id', $thisId);
            }
            const tbodyId1 = 'mtapplisting-' + $thisId + '1';
            const tbodyId2 = 'mtapplisting-' + $thisId + '2';
            /*  Set IDs  */

            if ($this.prev().is('label')) {
              $this.prev().addClass('d-block w-100 mb-3');
            }
            $this.parent().addClass('form-inline');
            $this
                .after('<button type="button" class="btn btn-default ml-3">' + l10n.select + '</button>')
                .next('button')
                /* ==================================================
                    Event of opening the dialog window
                ================================================== */
                .on('click', function(e){ // Don't use ".mtDialog()"

                    // Set the trigger id
                    const $dialog = $('#mtapplisting-dialog').data('triggerId', $thisId);

                    if (op.cbAfterOpenDialogFirst !== null && typeof op.cbAfterOpenDialogFirst === 'function') {
                        op.cbAfterOpenDialogFirst({name: 'cbAfterOpenDialogFirst'}, $dialog, $this, $(e.target));
                    }

                    // MTAppListing template
                    const tmplData = {
                        dialog: {
                            id: $thisId + '-modal',
                            title: op.dialogTitle ? op.dialogTitle : l10n.title
                        }
                    };
                    const html = Template.process('dialog', tmplData, tmpl);

                    // Append MTAppListing template to the dialog, and show the dialog
                    $dialog
                        .html(html)
                        .children('.modal')
                            .height($(window).height() - 110)
                            .modal();

                    // Hide the indicator
                    const $indicator = $dialog.find('.mtapplisting-indicator');

                    // Options for ajax
                    const ajaxOptions = {
                        dataType: op.dataType,
                        url: $this.attr('data-url') ? $this.attr('data-url') : op.url,
                        data: op.data,
                        cache: op.cache
                    };
                    if (op.accessToken) {
                        ajaxOptions.headers = {
                            'X-MT-Authorization': 'MTAuth accessToken=' + op.accessToken
                        }
                    }
                    if (op.ajaxOptions) {
                        $.extend(ajaxOptions, op.ajaxOptions);
                    }

                    // Get JSON by ajax
                    $.ajax(ajaxOptions).done(function(response){

                        // Process the response
                        if (op.cbProcessResponse !== null && typeof op.cbProcessResponse === 'function') {
                            response = op.cbProcessResponse({name: 'cbProcessResponse'}, response);
                        }

                        let filterJSONTable = true;
                        if (op.cbAjaxDoneFilterJSONTable !== null && typeof op.cbAjaxDoneFilterJSONTable === 'function') {
                            filterJSONTable = op.cbAjaxDoneFilterJSONTable({name: 'cbAjaxDoneFilterJSONTable'}, $dialog, response);
                        }

                        // Show the dialog content
                        $indicator.addClass('hidden').next().removeClass('hidden');

                        if (!filterJSONTable) {
                            $dialog
                                .find('div.modal-body').text(l10n.noItems)
                                .end()
                                .find('div.mtapplisting-actions .ok').replaceWith('<button type="button" class="btn btn-default disabled" disabled="disabled">挿入</button>')
                                .end()
                                .find('#mtapplisting-dialog-top').remove();
                            return false;
                        }
                        // Dummy textarea1 options
                        op.jsontable.caption = l10n.selectedItems;
                        op.jsontable.headerPosition = 'top';
                        op.jsontable.footer = false;
                        op.jsontable.items = null;
                        op.jsontable.edit = false;
                        op.jsontable.add = false;
                        op.jsontable.clear = false;
                        op.jsontable.cellMerge = false;
                        op.jsontable.sortable = false;
                        op.jsontable.listingCheckbox = true;
                        op.jsontable.listingTargetKey = op.jsontable.listingTargetKey || 'id';
                        op.jsontable.optionButtons = null;
                        op.jsontable.cbAfterSelectRow = function(cb, $tr, checked){
                            if (op.jsontable.listingCheckboxType === 'radio') {
                                return false;
                            }
                            let defaultAction = true;
                            if (op.cbAfterSelectRowUpperTable !== null && typeof op.cbAfterSelectRowUpperTable === 'function') {
                                defaultAction = op.cbAfterSelectRowUpperTable({name: 'cbAfterSelectRowUpperTable'}, $tr, checked);
                            }
                            if (defaultAction) {
                                if (!checked) {
                                    $tr.prependTo('#mtapplisting-tbody2');
                                }
                            }
                        };
                        op.jsontable.cbAfterBuild = function(cb, $container){
                            $container.find('tbody').attr('id', 'mtapplisting-tbody1');
                        };
                        $('#mtapplisting-textarea1').MTAppJSONTable(op.jsontable);
                        $('#mtapplisting-tbody1')
                            /*.hide()*/
                            .data('target-key', op.jsontable.listingTargetKey)
                            .html('')
                            .sortable({
                                items: 'tr',
                                cursor: 'move',
                                placeholder: 'mtapp-state-highlight'
                            });

                        // Dummy textarea2 options
                        op.jsontable.caption = null; // overwrite
                        op.jsontable.footer = true; // overwrite
                        op.jsontable.items = response; // overwrite
                        op.jsontable.cbAfterSelectRow = function(cb, $tr, checked){  // overwrite
                            let defaultAction = true;
                            if (op.cbAfterSelectRowLowerTable !== null && typeof op.cbAfterSelectRowLowerTable === 'function') {
                                defaultAction = op.cbAfterSelectRowLowerTable({name: 'cbAfterSelectRowLowerTable'}, $tr, checked);
                            }
                            if (defaultAction) {
                                $('#mtapplisting-textarea1').next().show();
                                if (checked) {
                                    if (op.jsontable.listingCheckboxType === 'radio') {
                                        $('#mtapplisting-tbody1 tr').appendTo('#mtapplisting-tbody2');
                                    }
                                    $tr.find('td').each(function(){
                                        const w = $(this).width();
                                        $(this).width(w + 'px');
                                    });
                                    $tr.appendTo('#mtapplisting-tbody1');
                                }
                            }
                        };
                        op.jsontable.cbAfterBuild = function(cb, $container){ // overwrite
                            $container.find('tbody').attr('id', 'mtapplisting-tbody2');
                            const savedValue = $this.val().replace(/^,|,$/g, '').split(',');
                            if (op.jsontable.listingCheckboxType === 'radio') {
                                $('td[data-value="' + savedValue[0].replace(/\s*/g, '') + '"]')
                                    .parent()
                                        .find('td:first-child input.jsontable-cb').prop('checked', true)
                                    .end()
                                    .appendTo('#mtapplisting-tbody1');
                            }
                            else {
                                for (let i = 0, l = savedValue.length; i < l; i++) {
                                    $('td[data-value="' + savedValue[i].replace(/\s*/g, '') + '"]').parent().find('td:first-child input.jsontable-cb').trigger('click');
                                }
                            }
                        };
                        op.jsontable.debug = false;

                        $('#mtapplisting-textarea2').MTAppJSONTable(op.jsontable);
                        if (op.cbAjaxDone !== null && typeof op.cbAjaxDone === 'function') {
                            op.cbAjaxDone({name: 'cbAjaxDone'}, $dialog);
                        }
                    })
                    .fail(function(jqXHR, status){
                        $indicator.addClass('hidden');
                        if (jqXHR.status && jqXHR.status == 404) {
                            $dialog.find('div.modal-body').text(jqXHR.status + ' : ' + l10n.ajaxFail);
                        }
                        if (op.cbAjaxFail !== null && typeof op.cbAjaxFail === 'function') {
                            op.cbAjaxFail({name: 'cbAjaxFail'}, $dialog, jqXHR, status);
                        }
                        $dialog
                            .find('div.mtapplisting-actions').removeClass('hidden')
                            .find('a.ok').replaceWith('<p class="action button disabled">挿入</p>')
                            .end()
                            .find('#mtapplisting-dialog-top').remove();
                    });

                    if (op.cbAfterOpenDialogLast !== null && typeof op.cbAfterOpenDialogLast === 'function') {
                        op.cbAfterOpenDialogLast({name: 'cbAfterOpenDialogLast'}, $dialog, $this);
                    }
                    return false;
                });
                /*  Event of opening the dialog window  */
        });
    };
    $.fn.MTAppListing.defaults = {
        // Ajax Options
        url: null, // [required] Data API Script URL (ex)http://your-host/mt/mt-data-api.cgi/v1/sites/1/entries
        data: null, // PlainObject: Data to be sent to the server.
        dataType: 'json', // Set this value to ajax options
        cache: false,
        accessToken: null,
        ajaxOptions: null, // Set plane object if you want to overwrite ajax options

        // Dialog
        dialogTitle: '', // Type the title of dialog window
        l10n: null, // Plain Object. Please check the code of l10n section.

        // Callbacks
        cbAfterOpenDialogFirst: null, // Called just after opening the dialog
        cbProcessResponse: null, // Process the response
        cbAjaxDoneFilterJSONTable: null, // Stop executing JSONTable by returning false from this function.
        // If you get JSON from Data API, you might want to set the following function to this option:
        //
        // cbAjaxDoneFilterJSONTable: function(cb, $dialog, response){
        //     return (response.items && response.items.length > 0);
        // },
        cbAjaxDone: null, // Called when data is loaded
        cbAjaxFail: null, // Called when data could not be get
        cbAfterCancel: null, // After clicking the cancel button
        cbAfterOK: null, // After clicking the OK button
        cbAfterSearch: null, // After searching
        cbAfterSearchReset: null, // After resetting the text filter
        cbAfterOpenDialogLast: null, // After opening the dialog
        cbAfterSelectRowUpperTable: null, // function({name: 'cbAfterSelectRowUpperTable'}, $tr, $(this).is(':checked')){}
        cbAfterSelectRowLowerTable: null, // function({name: 'cbAfterSelectRowLowerTable'}, $tr, $(this).is(':checked')){}

        // JSONTable
        jsontable: { // You can set the following options of MTAppJSONTable
            header: null, // [required] Object: Table header
            headerOrder: [], // [required] Array: Order of table header
            itemsRootKey: 'items', // [required] String: The root key of items
            listingTargetKey: 'id', // [required] String: Target key  which is saved value when listing mode is applied
            listingCheckboxType: 'checkbox', // 'checkbox' or 'radio'
            listingTargetEscape: false // [required] Boolean: encodeURIComponent(target value)
        }
    };
    // end - $.fn.MTAppListing()


    // ---------------------------------------------------------------------
    //  $.MTAppTemplateListCustomize();
    // ---------------------------------------------------------------------
    //                                             Latest update: 2016/06/08
    //
    //  テンプレートの管理画面（一覧画面）を見やすくします。
    // ---------------------------------------------------------------------
    $.MTAppTemplateListCustomize = function(options){
        var op = $.extend({}, $.MTAppTemplateListCustomize.defaults, options);
        if (mtappVars.screen_id !== 'list-template') {
            return;
        }

        if (op.displayType === 'listIndent') {
            $('table.listing-table tbody').each(function(){
                var $tdList = $(this).find('td.template-name');
                for (let i = 0, l = op.templateNameSets.length; i < l; i++) {
                    var $firstTr;
                    var $tr;
                    $tdList.find('a').filter(function(idx, elm){
                      if (op.templateNameSets[i]['keyword'] instanceof RegExp) {
                        return op.templateNameSets[i]['keyword'].test(elm.innerHTML);
                      }
                      else {
                        return elm.innerHTML.indexOf(op.templateNameSets[i]['keyword']) !== -1;
                      }
                    }).each(function(idx){
                        var _replacement = op.templateNameSets[i]['replacement'] ? op.templateNameSets[i]['replacement']: '';
                        this.innerHTML = this.innerHTML.replace(op.templateNameSets[i]['keyword'], _replacement);
                        this.style.position = 'relative';
                        this.style.left = '2em';
                        if (idx === 0) {
                            $firstTr = $(this).parents('tr');
                            var tdCount = $firstTr.find('td').length;
                            var paddingLeft = 8;
                            $(this).parent().prevAll().each(function(){
                                paddingLeft += $(this).width();
                            });
                            $firstTr.before(
                                '<tr>' +
                                    '<td colspan="' + tdCount + '" style="padding-left:' + paddingLeft + 'px;font-weight:' + op.labelWeight + ';">' +
                                        op.templateNameSets[i]['label'] +
                                    '</td>' +
                                '</tr>'
                            );
                        }
                        else {
                            $(this).parents('tr').insertAfter($tr);
                        }
                        $tr = $(this).parents('tr');
                    });
                }
            });
        }
        else {
            $('table.listing-table tbody').each(function(){
                var $tdList = $(this).find('td.template-name');
                var $firstTd;
                var $parentTbody;
                for (let i = 0, l = op.templateNameSets.length; i < l; i++) {
                    $tdList.find('a').filter(function(idx, elm){
                      if (op.templateNameSets[i]['keyword'] instanceof RegExp) {
                        return op.templateNameSets[i]['keyword'].test(elm.innerHTML);
                      }
                      else {
                        return elm.innerHTML.indexOf(op.templateNameSets[i]['keyword']) !== -1;
                      }
                    }).each(function(idx){
                        var _replacement = op.templateNameSets[i]['replacement'] ? op.templateNameSets[i]['replacement']: '';
                        this.innerHTML = this.innerHTML.replace(op.templateNameSets[i]['keyword'], _replacement);
                        if (idx === 0) {
                            $firstTd = $(this).parent().prepend('<span style="display:' + op.labelType + ';margin-right:5px;margin-bottom:5px;font-weight:' + op.labelWeight + ';">' + op.templateNameSets[i]['label'] + '</span>');
                            $firstTd.parent().attr('data-group-order', i);
                            $parentTbody = $firstTd.parents('tbody');
                            $firstTd.prevAll('.cb').find(':checkbox').remove();
                        }
                        else {
                            $(this).closest('tr').hide().end().css({marginLeft: '5px'}).appendTo($firstTd);
                        }
                    });
                }
                if (op.moveTop) {
                    for (let i = op.templateNameSets.length - 1; i >= 0; i--) {
                        $('[data-group-order=' + i + ']').prependTo($parentTbody);
                    }
                }
            });
        }
        $('tbody tr:visible').each(function(idx){
            if (idx % 2 == 1) {
                $(this).removeClass('odd even').addClass('odd');
            }
            else {
                $(this).removeClass('odd even').addClass('even');
            }
        });
    };
    $.MTAppTemplateListCustomize.defaults = {
        templateNameSets: [],
        displayType: 'listIndent', // String: 'listIndent' or 'group'
        labelWeight: 'bold', // String: 'bold' or 'normal'
        // If you set 'group' to 'displayType' option, set the following options.
        moveTop: false, // Boolean: true or false
        labelType: 'block' // String: 'block' or 'inline'
    };
    // end - $.MTAppTemplateListCustomize();


    // ---------------------------------------------------------------------
    //  $.MTAppUserMenuWidget();
    // ---------------------------------------------------------------------
    //                                             Latest update: 2016/08/19
    //
    // オリジナルの管理メニューウィジェット・メニューを追加します。
    //
    // ---------------------------------------------------------------------
    $.MTAppUserMenuWidget = function(options, words){
        var op = $.extend({}, $.MTAppUserMenuWidget.defaults, options);
        var language = mtappVars.language === 'ja' ? 'ja' : 'en';
        var words = words || {};
        var l10n = $.extend({}, $.MTAppUserMenuWidget.l10n[language], words);
        if (!mtappVars.MTAppUserMenuWidget) {
            mtappVars.MTAppUserMenuWidget = {
                zIndex: 10000
            };
        }

        var widgetLabel = op.label|| l10n.widgetName;
        var widgetId = mtapp.temporaryId('temp-');
        var items = op.items;

        // Template
        var tmpl = {
            container: '<div id="[#= id #]" class="mtapp-usermenu-container [#= type #]" style="width:[#= width #];">[#= widget #]</div>',
            item: [
                '[# if (header) { #]',
                '<li class="mtapp-usermenu-header">',
                '[# } else { #]',
                '<li class="mtapp-usermenu-item">',
                '[# } #]',
                    '[# if (url) { #]',
                    '<a href="[#= url #]">[#= label #]</a>',
                    '[# } else { #]',
                    '<span class="header-label">[#= label #]</span>',
                    '[# } #]',
                    '[# if (excerpt) { #]',
                    '<p class="excerpt">[#= excerpt #]</p>',
                    '[# } #]',
                    '[# if (hint) { #]',
                    '<span class="hint">[#= hint #]</span>',
                    '[# } #]',
                '</li>'
            ].join(''),
            menu: '<li><a id="[#= target #]-open" class="mtapp-usermenu-open" href="#[#= target #]">[#= label #]</a></li>'
        };
        // Make <li>
        var content = '';
        if (items.length > 0) {
            for (let i = 0, l = items.length; i < l; i++) {
                content += Template.process('item', {
                    label:  items[i].label,
                    url:    items[i].url,
                    hint:   items[i].hint,
                    header: items[i].header,
                    excerpt: items[i].excerpt
                }, tmpl);
            }
        }
        // Make widget HTML
        var widget = mtapp.makeWidget({
            label: widgetLabel,
            content: '<ul>' + content + '</ul>'
        });

        // Insert HTML
        if (op.type === 'dashboard' || op.type === 'both') {
            if (mtappVars.screen_id === 'dashboard') {
                // Make container included widget
                var widgetContainer = Template.process('container', {
                    type: 'dashboard',
                    id: widgetId + '-widget',
                    width: op.width,
                    widget: widget
                }, tmpl);
                // Insert HTML
                $('#widget-container-main').prepend(widgetContainer);
            }
        }
        if (op.type === 'menu' || op.type === 'both') {
            // Make container included widget
            var widgetContainer = Template.process('container', {
                type: 'menu',
                id: widgetId,
                width: op.width,
                widget: widget
            }, tmpl);
            // Make HTML of menu
            var menu = Template.process('menu', {target: widgetId, label: widgetLabel}, tmpl);
            // Insert HTML
            $('body').prepend(widgetContainer);
            $('#user').before(menu);
            $('#' + widgetId + '-open').on('click.MTAppUserMenuWidgetOpen', function(){
                mtappVars.MTAppUserMenuWidget.zIndex++;
                $('#' + widgetId).css('z-index', mtappVars.MTAppUserMenuWidget.zIndex).fadeToggle('fast');
                return false;
            })
        }
    };
    $.MTAppUserMenuWidget.l10n = {
      en: {
          widgetName: 'User Menu'
      },
      ja: {
          widgetName: 'ユーザーメニュー'
      }
    };
    $.MTAppUserMenuWidget.defaults = {
        label: '',
        width: '300px',
        type: 'both', // 'menu', 'dashboard' or 'both'
        // e.g
        // items: [
        //   {
        //     label: 'This is a header',
        //     header: true,
        //     hint: 'This is a header section.'
        //   },
        //   {
        //     label: 'Create Book',
        //     url: CMSScriptURI + '?__mode=view&_type=entry&blog_id=4&title=Book',
        //     excerpt: 'Create a new entry with "Book" title in First Blog'
        //   },
        //   {
        //     label: 'Create Magazine',
        //     url: CMSScriptURI + '?__mode=view&_type=entry&blog_id=4&title=Magazine',
        //     hint: 'Create a new entry with "Magazine" title in First Blog'
        //   },
        // ]
        items: []
    };
    // end - $.MTAppUserMenuWidget();


    // -------------------------------------------------
    //  $(foo).MTAppShowListEntries();
    //
    //  Description:
    //    フィールドに保存されているIDの記事のタイトルをData APIで取得して表示する
    //
    //  Usage:
    //    $(foo).MTAppShowListEntries(options);
    //
    // -------------------------------------------------
    $.fn.MTAppShowListEntries = function(options){
        var op = $.extend({}, $.fn.MTAppShowListEntries.defaults, options);

        if (op.api === null || op.siteId === 0) {
            return;
        }
        return this.each(function(){

            // Hide the field applied MTAppListing
            if (!op.debug) {
                $(this).hide();
            }

            $(this).on('showListEntries', function(){

                var $this = $(this);

                $this.data('api-obj', op.api);

                // Get value of the field applied MTAppListing
                var ids = $this.val().replace(/^,|,$/g, '');
                var idsArray = ids.split(',');

                // Get div.mtapplisting-item-list by id
                var $itemListContainer = $this.prev('.mtapplisting-item-list');
                if ($itemListContainer.length < 1) {
                    // <div class="mtapplisting-item-list">
                    //   <div class="mtapplisting-item-list-content"></div>
                    //   <img src="indicator-login.gif" alt="">
                    // </div>
                    var itemList = [
                        '<div class="mtapplisting-item-list">',
                            '<div class="mtapplisting-item-list-content"></div>',
                            '<img class="mtapplisting-item-list-loading" src="' + StaticURI + 'images/indicator-login.gif" alt="" style="display:none;">',
                        '</div>'
                    ].join("");
                    $(this).before(itemList);
                    $itemListContainer = $this.prev('.mtapplisting-item-list');
                }
                $itemListContainer.find('.mtapplisting-item-list-content').html('');
                if (!ids) {
                    return;
                }
                $itemListContainer.find('.mtapplisting-item-list-loading').show();


                var type = op.model === 'page' ? 'page' : 'entry';
                var entries = {};
                var tmpl = {};
                tmpl.ul = function(li){
                   return '<ul>' + li + '</ul>';
                };
                if (op.canEditAllPosts) {
                    tmpl.li = function(obj){
                        return [
                            '<li>',
                                '<span class="title">',
                                  '<a href="' + CMSScriptURI + '?__mode=view&_type=' + type + '&blog_id=' + op.siteId + '&id=' + obj.id + '" target="_blank">' + obj.title + '</a>',
                                '</span>',
                                '<span class="view-link">',
                                  '<a href="' + obj.permalink + '" target="_blank">',
                                    '<img alt="記事を見る" src="' + StaticURI + 'images/status_icons/view.gif">',
                                  '</a>',
                                '</span>',
                            '</li>',
                            ''
                        ].join("");
                    };
                }
                else {
                    tmpl.li = function(obj){
                        return [
                            '<li>',
                                '<span class="title">' + obj.title + '</span>',
                                '<span class="view-link">',
                                  '<a href="' + obj.permalink + '" target="_blank">',
                                    '<img alt="記事を見る" src="' + StaticURI + 'images/status_icons/view.gif">',
                                  '</a>',
                                '</span>',
                            '</li>',
                            ''
                        ].join("");
                    };
                }
                var tmplOut = {};
                for (let key in tmpl) {
                    tmplOut[key] = [];
                }

                var params = op.params || {};
                params.includeIds = ids;
                if (!('limit' in params)) {
                    params.limit = 9999;
                }
                if (!('fields' in params)) {
                    params.fields = 'id,title,permalink';
                }
                var methodName = op.model === 'page' ? 'listPages' : 'listEntries';
                op.api[methodName](op.siteId, params, function(response) {
                    if (response.error) {
                        return;
                    }
                    if (response.items.length > 0) {
                        for (let i = 0, l = response.items.length; i < l; i++) {
                            if (!response.items[i].title) {
                                response.items[i].title = 'id:' + response.items[i].id;
                            }
                            entries[ 'id-' + response.items[i].id ] = response.items[i];
                        }
                        for (let i = 0, l = idsArray.length; i < l; i++) {
                            tmplOut.li.push( tmpl.li( entries[ 'id-' + idsArray[i] ] ) );
                        }
                    }
                    $itemListContainer
                        .find('.mtapplisting-item-list-content').html(tmpl.ul(tmplOut.li.join("")))
                        .end()
                        .find('.mtapplisting-item-list-loading').hide();
                });
            });
        });
    };
    $.fn.MTAppShowListEntries.defaults = {
        model: 'entry', // 'entry' or 'page'
        // For Data API
        api: null,
        siteId: 0,
        params: null,
        // Permissions
        canEditAllPosts: true,
        debug: false
    };
    /*  end - $.fn.MTAppShowListEntries()  */

    // -------------------------------------------------
    //  $.MTAppApplyTinyMCE();
    //
    //  Description:
    //    概要欄やテキスト（複数行）のカスタムフィールドをリッチテキストエディタに変更する
    //
    //  Usage:
    //    $.MTAppApplyTinyMCE(Options);
    //
    //  Options:
    //    target: {Array} リッチテキストエディタに変更するtextareaのidの配列
    //    sortable: {Boolean} ドラッグアンドドロップのソートに対応させる場合はtrue
    // -------------------------------------------------
    $.MTAppApplyTinyMCE = function(options){
        var op = $.extend({}, $.MTAppApplyTinyMCE.defaults, options);
        if (mtappVars.screen_id !== 'edit-entry') {
          return;
        }
        // カスタムフィールドの場合の全画面モードのスタイルを追加
        var head = document.getElementsByTagName('head').item(0);
        var style = document.createElement('style');
        var rule = document.createTextNode(
            '[id^=customfield_] .field-content.fullscreen_editor iframe,[id^=customfield_] .field-content.fullscreen_editor textarea {height: ' + (jQuery(window).height() - 80) + 'px !important;}'
        );
        style.appendChild(rule);
        head.appendChild(style);
        // END カスタムフィールドの場合の全画面モードのスタイルを追加
        var target = op.target;
            // target = ['excerpt', 'customfield_document_textarea']
        var targetTrim = {};
            // targetTrim = {
            //     'excerpt': 'excerpt',
            //     'customfield_document_textarea': 'document_textarea'
            // }
        var targetMce = {};
            // targetMce = {
            //     'excerpt': {id: "excerpt", options: Object, editors: Object, parentElement: null, currentEditor: MT.Editor.TinyMCE…},
            //     'customfield_document_textarea': {id: "document_textarea", options: Object, editors: Object, parentElement: null, currentEditor: MT.Editor.TinyMCE…}
            // }
        for (let i = 0, l = target.length; i < l; i++) {
            if (target[i].indexOf('customfield_') !== -1) {
                targetTrim[target[i]] = target[i].replace('customfield_', '');
                document.getElementById(target[i]).id = targetTrim[target[i]];
            }
            else {
                targetTrim[target[i]] = target[i];
            }
            targetMce[target[i]] = new MT.EditorManager(targetTrim[target[i]]);
        }
        $('#entry_form').on('submit', function() {
            for (let i = 0, l = target.length; i < l; i++) {
                targetMce[target[i]].currentEditor.save();
            }
        });
        if (op.sortable) {
            $('#sortable').sortable({
                start: function(event, ui){
                    var id = ui.item[0].id.replace(/-field/,'');
                    if ($.inArray(id, target) !== -1) {
                        targetMce[id].currentEditor.save();
                    }
                },
                stop: function(event, ui){
                    var id = ui.item[0].id.replace(/-field/g,'');
                    if ($.inArray(id, target) !== -1) {
                        $('#' + targetTrim[id]).removeAttr('style').prev().remove();
                        targetMce[id] = new MT.EditorManager(targetTrim[id]);
                    }
                }
            });
        }
    };
    $.MTAppApplyTinyMCE.defaults = {
        target: [],
        sortable: true
    };
    // end - $.MTAppApplyTinyMCE()

    // ---------------------------------------------------------------------
    //  $(foo).MTAppMultiFileUpload();
    // ---------------------------------------------------------------------
    //                                             Latest update: 2016/05/09
    //
    // Data API を利用してファイルをアップロードします。
    // ---------------------------------------------------------------------
    $.fn.MTAppMultiFileUpload = function(options){
        var op = $.extend({}, $.fn.MTAppMultiFileUpload.defaults, options);

        // Check some required variables
        if (op.api === null) {
            return $.errorMessage('MTAppMultiFileUpload', 'The "api" option is required.', 'alert', false);
        }
        var api = op.api;
        if (op.siteId === 0) {
            return $.errorMessage('MTAppMultiFileUpload', 'The "siteId" option is required.', 'alert', false);
        }
        if (typeof api.uploadAsset !== 'function') {
            return $.errorMessage('MTAppMultiFileUpload', 'mt-data-api.js is required.', 'alert', false);
        }

        var l10n = {};
        if (mtappVars.language === 'ja') {
            l10n.widgetTitle = 'ファイルアップロード';
            l10n.remove = '削除';
        }
        else {
            l10n.widgetTitle = 'Upload File';
            l10n.remove = 'Remove';
        }
        // Overwrite existing l10n
        if (op.l10n) {
            for (let key in op.l10n) {
                l10n[key] = op.l10n[key];
            }
        }

        return this.each(function(){
            // Get the value of target element
            var $this = $(this);
            var thisValue = op.type === 'input' ? $this.val() : '';
            var thisValueArray = thisValue !== '' ? thisValue.split(',') : [];

            // Set a random number
            var rand = '' + Math.random();
            rand = rand.replace('.','');

            // Set ids
            var inputFileId = 'mtapp-multifileupload-file-' + rand;
            var inputUploadBtnId = 'mtapp-multifileupload-btn-' + rand;
            var inputUploadItemsId = 'mtapp-multifileupload-items-' + rand;

            // Make remove button
            var removeHtml = '<a class="mtapp-item-remove" href="#">' + l10n.remove + '</a>';

            // Use api.authenticate
            if (typeof mtappVars.DataAPIFileUploadUser === 'string' && typeof mtappVars.DataAPIFileUploadUserPassword === 'string') {
                api.authenticate({
                    username: mtappVars.DataAPIFileUploadUser,
                    password: mtappVars.DataAPIFileUploadUserPassword,
                    remember: true
                }, function(authResponse){
                    successAuthenticattion(authResponse);
                });
            }
            // Use api.getToken
            else {
                api.getToken(function(authResponse) {
                    successAuthenticattion(authResponse, true);
                });
            }

            // Core function
            function successAuthenticattion(authResponse, useDataAPIAuth) {
                // An error occurred
                if (authResponse.error) {
                    if (authResponse.error.code === 401 && useDataAPIAuth) {
                        location.href = api.getAuthorizationUrl(location.href);
                    }
                    else if (authResponse.error.message) {
                        return $.errorMessage('MTAppMultiFileUpload', authResponse.error.message, 'alert', false);
                    }
                    else {
                        return $.errorMessage('MTAppMultiFileUpload', 'An error occurred while authenticating.', 'alert', false);
                    }
                }

                // Make the multiple attribute
                var multiple = op.multiple ? ' multiple' : '';

                // Make upload form
                var uploadFromHtml = '';
                if (op.uploadButton) {
                    uploadFromHtml =
                        '<div class="mtapp-multifileupload-file">' +
                            '<input type="file" id="' + inputFileId + '"' + multiple + ' style="display:none;">' +
                            op.uploadButton +
                        '</div>';
                }
                else {
                    uploadFromHtml =
                        '<div class="mtapp-multifileupload-file"><input type="file" id="' + inputFileId + '"' + multiple + '></div>';
                }
                uploadFromHtml += '<div class="mtapp-multifileupload-items" id="' + inputUploadItemsId + '" style="display:none;"></div>';
                // Widget Type
                if (op.type === 'widget') {
                    var itemUploadWidget = mtapp.makeWidget({
                        label: l10n.widgetTitle,
                        content: uploadFromHtml
                    });
                    $("#related-content").prepend(itemUploadWidget);
                }
                // Input Type
                else {
                    $this.css(op.targetInputStyle).after(uploadFromHtml);
                }
                // When an original button is clicked
                if (op.uploadButton) {
                    $('#' + inputFileId).next().on('click', function(){
                        $('#' + inputFileId).trigger('click');
                        return false;
                    });
                }

                // Get the element for appending upload items
                var $itemUploadItems = $('#' + inputUploadItemsId).on('click', 'a.mtapp-item-remove', function(e){
                    var $remove = $(e.target);
                    var $item = $remove.prev();
                    var itemSavedValue = $item.data('itemvalue');
                    var valueArray = $this.val().split(',');
                    valueArray = $.grep(valueArray, function(v, i){
                        return v != itemSavedValue;
                    });
                    $this.val(valueArray.join(','));
                    $remove.parent('.mtapp-upload-item').remove();
                    return false;
                });

                // When the edit entry screen is loading, set upload items to the p element nearby the target element of MTAppMultiFileUpload
                var itemUploadItemsHtml = '';
                if (mtappVars.screen_id === 'edit-entry') {
                    var $assetList = $("#asset-list");
                    var $includeAssetIds = $("#include_asset_ids");
                    if (op.type === 'input' && $this.val() !== '' && $assetList.length) {
                        for (let i = 0, l = thisValueArray.length; i < l; i++) {
                            // If saved value is ID
                            if (op.saveData === 'id') {
                                var $listAsset = $('#list-asset-' + thisValueArray[i]);
                                if ($listAsset.hasClass('asset-type-image')) {
                                    itemUploadItemsHtml += '<p class="mtapp-upload-item"><a class="mtapp-item-type-image" href="' + CMSScriptURI + '?__mode=view&amp;_type=asset&amp;blog_id=' + mtappVars.blog_id + '&amp;id=' + thisValueArray[i] + '" target="_blank" data-itemvalue="' + thisValueArray[i] + '"><img src="' + $listAsset.find('img').attr('src') + '"></a>' + removeHtml + '</p>';
                                }
                                else if ($listAsset.hasClass('asset-type-file')) {
                                    itemUploadItemsHtml += '<p class="mtapp-upload-item"><a class="mtapp-item-type-file" href="' + CMSScriptURI + '?__mode=view&amp;_type=asset&amp;blog_id=' + mtappVars.blog_id + '&amp;id=' + thisValueArray[i] + '" target="_blank" data-itemvalue="' + thisValueArray[i] + '">' + $listAsset.find('a.asset-title').text() + '</a>' + removeHtml + '</p>';
                                }
                            }
                            // If saved value is URL
                            else if (op.saveData === 'url') {
                                // Image's URL
                                if (/(jpg|jpeg|gif|png|bmp|ico|tif|tiff)$/i.test(thisValueArray[i])) {
                                    itemUploadItemsHtml += '<p class="mtapp-upload-item"><a class="mtapp-item-type-image" href="' + thisValueArray[i] + '" target="_blank" data-itemvalue="' + thisValueArray[i] + '"><img src="' + thisValueArray[i] + '"></a>' + removeHtml + '</p>';
                                }
                                // Other type file URL
                                else {
                                    itemUploadItemsHtml += '<p class="mtapp-upload-item"><a class="mtapp-item-type-file" href="' + thisValueArray[i] + '" target="_blank" data-itemvalue="' + thisValueArray[i] + '">' + thisValueArray[i] + '</a>' + removeHtml + '</p>';
                                }
                            }
                        }
                        // Set items
                        $itemUploadItems.html(itemUploadItemsHtml).show();
                    }
                }

                // When some files are selected at input:file element, upload those files by Data API.
                $('#' + inputFileId).on('change', function(){
                    // Get the HTML element which selected files.
                    var inputFile = $(this)[0];
                    // Get the count of selected files.
                    var l = inputFile.files.length;
                    // Remove a element for showing "No Assets".
                    if (mtappVars.screen_id === 'edit-entry') {
                        $("#empty-asset-list").remove();
                    }
                    // Repeat the number of selected files.
                    var first = true;
                    var last = false;
                    var counter = 0;
                    // Upload a file
                    var upload = function(response){
                        counter++;
                        // An error occurred
                        if (response.error) {
                            var errorMessage = response.error.message ? ': ' + response.error.message : 'An error occurred while uploading.';
                            return $.errorMessage('MTAppMultiFileUpload', errorMessage, 'alert', false);
                        }
                        // Input Type
                        if (op.type === 'input') {
                            var val = $this.val();
                            if (val && op.multiple) {
                                $this.val(val + ',' + response[op.saveData]);
                            }
                            else {
                                $this.val(response[op.saveData]);
                            }
                        }
                        // Set upload items to the p element nearby the target element of MTAppMultiFileUpload
                        var itemHtml = '';
                        // If saved value is ID
                        if (op.saveData === 'id') {
                            if (response.mimeType.indexOf("image") !== -1) {
                                itemHtml = '<p class="mtapp-upload-item"><a class="mtapp-item-type-image" href="' + CMSScriptURI + '?__mode=view&amp;_type=asset&amp;blog_id=' + mtappVars.blog_id + '&amp;id=' + response.id + '" target="_blank" data-itemvalue="' + response.id + '"><img src="' + response.url + '"></a>' + removeHtml + '</p>';
                                // itemHtml = '<a href="' + response.url + '" target="_blank"><img src="' + response.url + '" style="display:block;max-width:215px;margin-bottom:5px;"></a>';
                                // itemHtml = '<img src="' + response.url + '" style="display:block;max-width:100px;margin-bottom:5px;">';
                            }
                            else {
                                itemHtml = '<p class="mtapp-upload-item"><a class="mtapp-item-type-file" href="' + CMSScriptURI + '?__mode=view&amp;_type=asset&amp;blog_id=' + mtappVars.blog_id + '&amp;id=' + response.id + '" target="_blank" data-itemvalue="' + response.id + '">' + response.filename + '</a>' + removeHtml + '</p>';
                                // itemHtml = '<a href="' + response.url + '" target="_blank">' + response.filename + '</a>';
                                // itemHtml = '<span style="display:block;">' + response.filename + '</span>';
                            }
                        }
                        // If saved value is URL
                        else if (op.saveData === 'url') {
                            // Image's URL
                            if (response.mimeType.indexOf("image") !== -1) {
                                itemHtml = '<p class="mtapp-upload-item"><a class="mtapp-item-type-image" href="' + response.url + '" target="_blank" data-itemvalue="' + response.url + '"><img src="' + response.url + '"></a>' + removeHtml + '</p>';
                            }
                            // Other type file URL
                            else {
                                itemHtml = '<p class="mtapp-upload-item"><a class="mtapp-item-type-file" href="' + response.url + '" target="_blank" data-itemvalue="' + response.url + '">' + response.url + '</a>' + removeHtml + '</p>';
                            }
                        }
                        // Remove a loading image
                        $itemUploadItems.find('img.loading').remove();
                        // Insert upload items
                        if (op.multiple) {
                            $itemUploadItems.append(itemHtml).show();
                        }
                        else {
                            $itemUploadItems.html(itemHtml).show();
                        }
                        // If edit entry screen is open, set upload items to entry assets
                        if (mtappVars.screen_id === 'edit-entry') {
                            var entryItemHtml = "";
                            // Images
                            if (response.mimeType.indexOf("image") !== -1) {
                                entryItemHtml = [
                                    '<li id="list-asset-' + response.id + '" class="asset-type-image" onmouseover="show(\'list-image-' + response.id + '\', window.parent.document)" onmouseout="hide(\'list-image-' + response.id + '\', window.parent.document)">',
                                        '<a href="' + CMSScriptURI + '?__mode=view&amp;_type=asset&amp;blog_id=' + mtappVars.blog_id + '&amp;id=' + response.id + '" class="asset-title">' + response.filename + '</a>',
                                        '<a href="javascript:removeAssetFromList(' + response.id + ')" title="Remove this asset." class="remove-asset icon-remove icon16 action-icon">Remove</a>',
                                        '<img id="list-image-' + response.id + '" src="' + response.url + '" class="list-image hidden" style="max-width:100px;">',
                                    '</li>'
                                ].join("");
                            }
                            // Other type files excluding images
                            else {
                                entryItemHtml = [
                                    '<li id="list-asset-' + response.id + '" class="asset-type-file">',
                                        '<a href="' + CMSScriptURI + '?__mode=view&amp;_type=asset&amp;blog_id=' + mtappVars.blog_id + '&amp;id=' + response.id + '" class="asset-title">' + response.filename + '</a>',
                                        '<a href="javascript:removeAssetFromList(' + response.id + ')" title="Remove this asset." class="remove-asset icon-remove icon16 action-icon">Remove</a>',
                                    '</li>'
                                ].join("");
                            }
                            // Insert upload items to entry assets
                            $assetList.append(entryItemHtml);
                            var _ids = $includeAssetIds.val();
                            if (_ids === "") {
                                $includeAssetIds.val(response.id);
                            }
                            else {
                                $includeAssetIds.val(_ids + "," + response.id);
                            }
                        }
                        if (op.cbAfterUpload !== null && typeof op.cbAfterUpload === 'function') {
                            if (l == counter) {
                              last = true;
                            }
                            op.cbAfterUpload({name: 'cbAfterUpload'}, $this, response, first, last);
                        }
                        first = false;
                    };
                    for (let i = 0; i < l; i++) {
                        var fileObj = inputFile.files[i];
                        // Make data to upload
                        var data = {
                            file: fileObj,
                            path: op.uploadPath,
                            autoRenameIfExists: op.autoRenameIfExists,
                            normalizeOrientation: op.normalizeOrientation
                        };
                        // The path of uploading images is defined
                        if (typeof op.uploadImagesPath === 'string' && fileObj.type.indexOf("image") !== -1) {
                            data.path = op.uploadImagesPath;
                        }
                        // The path of uploading files excluding images is defined
                        else if (typeof op.uploadFilesPath === 'string') {
                            data.path = op.uploadFilesPath;
                        }
                        // Show a loading image
                        $itemUploadItems.append('<img class="loading" src="' + StaticURI + 'images/indicator-login.gif" alt="">').show();
                        // Adjustment by varsions
                        if (api.getVersion() == 1) {
                          api.uploadAsset(op.siteId, data, upload);
                        }
                        else {
                          data.site_id = op.siteId;
                          api.uploadAsset(data, upload);
                        }
                    }
                });
            } // Core function
        });
    };
    $.fn.MTAppMultiFileUpload.defaults = {
        // Plain Object. Please check the code of l10n section.
        l10n: null,
        // For Data API and api.uploadAsset()
        api: null, // Set Data API Object
        // Upload items to this ID's blog
        siteId: mtappVars.blog_id,
        // If this value is true and the file with the same filename exists,
        // the uploaded file is automatically renamed to the random generated name.
        autoRenameIfExists: true,
        // If this value is true and the uploaded file has a orientation information in Exif,
        // this file's orientation is automatically normalized.
        normalizeOrientation: true,
        // 'input' or 'widget'
        type: 'input',
        // If you set input to the type option, this value is added to style of the target element.
        targetInputStyle: {
            display: 'inline',
            marginRight: '1em',
            width: '20em'
        },
        // If this value is true, the multiple attribute is edded to input:file.
        multiple: true,
        // Set 'id' or 'url'. This value is a propaty name of assets resource.
        saveData: 'id',
        // Set the basic upload directory path from a root of blog url.
        uploadPath: 'upload',
        // Set the upload directory path from a root of blog url for images.
        // e.g. 'upload/images'
        uploadImagesPath: null,
        // Set the upload directory path from a root of blog url for other type files excluding images.
        // e.g. 'upload/files'
        uploadFilesPath: null,
        // If you would like to use an original file button, set HTML to this option.
        uploadButton: null,
        // Called after upload files.
        // e.g.
        // cbAfterUpload: function(cb, $this, response, first, last){
        //     do something
        // }
        // - cb : {name: 'cbAfterUpload'}
        // - $this : The target element applying .MTAppMultiFileUpload()
        // - response : The respunse from uploadAsset()
        // - first : When the loop is first, set true
        // - last : When the loop is last, set true

        cbAfterUpload: null,
        debug: false
    };
    /*  end - $.fn.MTAppMultiFileUpload()  */


    // -------------------------------------------------
    //  $.MTAppGetCategoryName();
    //
    //  Description:
    //    記事の編集画面ではカテゴリ名を、ウェブページの編集画面ではフォルダ名を取得できます
    //
    //  Usage:
    //    $.MTAppGetCategoryName();
    //
    //  Options:
    //    categories: {Array} MT.App.categoryListを渡します
    //    id: {Number} 調べたいカテゴリidを渡します
    //    field: {String} label or basename
    // -------------------------------------------------
    $.MTAppGetCategoryName = function(options){
        var op = $.extend({}, $.MTAppGetCategoryName.defaults, options);

        if ($.type(op.categories) !== 'array' || op.id == 0 || ! /^\d+$/.test(op.id)) {
            return;
        }
        for (let i = 0, l = op.categories.length; i < l; i++) {
            if (op.categories[i].id == op.id) {
                return op.categories[i][op.field];
            }
        }
    };
    $.MTAppGetCategoryName.defaults = {
        categories: null,
        id: 0,
        field: 'label'
    };
    // end - $.MTAppGetCategoryName()

    // -------------------------------------------------
    //  $.MTAppNoScrollRightSidebar();
    //
    //  Description:
    //    右サイドバーのウィジェットをスクロールに追随するようにする。
    //
    //  Usage:
    //    $.MTAppNoScrollRightSidebar(Options);
    //
    //  Options:
    //    closeMode: {Boolean} true=ウィジェットを閉じた状態にする。
    //    openSelector: {String} closeMode が true の場合で、空いた状態にしておきたいウィジェットのIDセレクタ
    // -------------------------------------------------
    $.MTAppNoScrollRightSidebar = function(options){
        var op = $.extend({}, $.MTAppNoScrollRightSidebar.defaults, options);

        if ($('#related-content').length < 1) return;
        var type = (op.closeMode) ? 'no-scroll-right-sidebar' : '';
        var $header = $('#related-content')
                .noScroll({'right': 0}, '#container')
                .addClass(type)
                .children()
                    .addClass('widget-wrapper')
                    .find('div.widget-header');
        if (op.closeMode) {
            $header.css({cursor:'pointer'});
            if (op.openSelector !== '') {
                $(op.openSelector).find('div.widget-content').show();
            }
            $header.on('click', function(){
                $(this)
                    .closest('div.widget-wrapper')
                        .siblings()
                            .find('div.widget-content').slideUp()
                            .end()
                        .end()
                    .find('div.widget-content').slideToggle();
            });
        } else {
            $header.on('click', function(){
                $(this).parents('div.widget-header').next().slideToggle();
            });
        }
    };
    $.MTAppNoScrollRightSidebar.defaults = {
        closeMode: false, // ウィジェットを閉じた状態にする場合はtrue
        openSelector: ''
    };
    // end - $.MTAppNoScrollRightSidebar()


    // -------------------------------------------------
    //  $(foo).MTAppMultiForm();
    //
    //  Description:
    //    指定した要素をチェックボックスかドロップダウンリストに変更する。いずれも multiple 対応。
    //
    //  Usage:
    //  　$(foo).MTAppTooltip(options);
    //
    //  Options:
    //    debug: {Boolean} true を設定すると元のフィールドを表示
    //    type: {String} 'checkbox', 'radio', 'select', 'select.multiple' のいずれか
    //    items: {Array} 生成する項目を配列で設定
    //    styles: {String} type: 'select.multiple' の場合のみ有効。select[multiple]の高さ調整に。
    // -------------------------------------------------
    $.fn.MTAppMultiForm = function(options){
        var op = $.extend({}, $.fn.MTAppMultiForm.defaults, options);
        return this.each(function(idx){
            if (!op.type || op.items.length == 0) return;
            var $this = (op.debug) ? $(this) : $(this).hide();

            var thisVal = $this.val();
            var thisData = (thisVal) ? thisVal.split(',') : [];
            for (let i = 0, l = thisData.length; i < l; i++) {
                thisData[i] = thisData[i].replace(/^\s+|\s+$/, '');
            }
            var thisId = $this.attr('id') ? 'mtappmltform-' + $this.attr('id') : '';
            if (thisId == '') {
                var rand = '' + Math.random();
                rand = rand.replace('.','');
                thisId = 'mtappmltform-' + op.type.replace('.multiple', '') + '-' + rand;
            }

            var _html = ['<span id="' + thisId + '" class="mtappmultiform mtappmultiform-' + op.type.replace('.', '-') + '">'];
            switch (op.type) {
                case 'checkbox':
                    for (let i = 0, l = op.items.length; i < l; i++) {
                        var checked = ($.inArray(op.items[i], thisData) > -1) ? ' checked' : '';
                        _html.push('<label><input type="checkbox" value="' + op.items[i] + '"' + checked + '>' + op.items[i] + '</label>');
                    }
                    _html.push();
                    break;
                case 'radio':
                    for (let i = 0, l = op.items.length; i < l; i++) {
                        var checked = ($.inArray(op.items[i], thisData) > -1) ? ' checked' : '';
                        _html.push('<label><input type="radio" name="' + thisId + '-item" value="' + op.items[i] + '"' + checked + '>' + op.items[i] + '</label>');
                    }
                    _html.push();
                    break;
                case 'select':
                    _html.push('<select>');
                    for (let i = 0, l = op.items.length; i < l; i++) {
                        var selected = ($.inArray(op.items[i], thisData) > -1) ? ' selected' : '';
                        _html.push('<option value="' + op.items[i] + '"' + selected + '>' + op.items[i] + '</option>');
                    }
                    _html.push('</select>');
                    break;
                case 'select.multiple':
                    _html.push('<select multiple="multiple" style="' + op.styles + '">');
                    for (let i = 0, l = op.items.length; i < l; i++) {
                        var selected = ($.inArray(op.items[i], thisData) > -1) ? ' selected' : '';
                        _html.push('<option value="' + op.items[i] + '"' + selected + '>' + op.items[i] + '</option>');
                    }
                    _html.push('</select>');
                    break;
            }
            _html.push('</span>');

            $this.after(_html.join(''));

            var $span = $('#' + thisId);
            // $span.find('input.default-checked').prop('checked', true);
            // $span.find('option.default-selected').prop('selected', true);
            if ($span.hasClass('mtappmultiform-radio') || $span.hasClass('mtappmultiform-checkbox')) {
                $span.find('input').on('click', function(){
                    thisData = [];
                    $span.find('input:checked').each(function(){
                        thisData.push($(this).val());
                    });
                    $this.val(thisData.join(','));
                });
            } else if ($span.hasClass('mtappmultiform-select') || $span.hasClass('mtappmultiform-select-multiple')) {
                $span.find('select').change(function(){
                    thisData = [];
                    $(this).find('option:selected').each(function(){
                        thisData.push($(this).val());
                    });
                    $this.val(thisData.join(','));
                }).trigger('change');
            }
        });
    };
    $.fn.MTAppMultiForm.defaults = {
        debug: false,
        type: '', // 'checkbox', 'radio', 'select', 'select.multiple' のいずれか
        items: [],
        styles: 'height: auto;'
    };
    // end - $(foo).MTAppMultiForm()


    // -------------------------------------------------
    //  $.MTAppSetting();
    // -------------------------------------------------
/*
    $.fn.MTAppSetting = function(options){
        var op = $.extend({}, $.fn.MTAppSetting.defaults, options);
    };
    $.fn.MTAppSetting.defaults = {
        foo: null,
        bar: null
    };
*/

    // -------------------------------------------------
    //  $.MTAppSettingGroup();
    // -------------------------------------------------
/*
    $.fn.MTAppSettingGroup = function(options){
        var op = $.extend({}, $.fn.MTAppSettingGroup.defaults, options);
    };
    $.fn.MTAppSettingGroup.defaults = {
        fields: null
    };
*/

    // -------------------------------------------------
    //  $.MTAppCustomize();
    // ---------------------------------------------------------------------
    $.MTAppCustomize = function(options){
        return mtapp.customize(options);
    };
    // end - $.MTAppCustomize()

    // -------------------------------------------------
    //  $.MTAppGetLabel();
    //
    //  Description:
    //    現在のページのlabel要素のテキストとそのlabel要素を指定するセレクタをmtapp.msg()で表示する
    //
    //  Usage:
    //    $.MTAppGetLabel();
    // -------------------------------------------------
    $.MTAppGetLabel = function(text){
        var res = [];
        var tagNames = text.split(",");
        for (let i = 0, l = tagNames.length; i < l; i++) {
            makeOptions($.trim(tagNames[i]));
        }
        mtapp.msg({
            msg: res.join(",<br>"),
            type: "success"
        });
        function makeOptions(tagName) {
            $(tagName).each(function(idx){
                var text = $(this).text();
                var id = $(this).attr("id");
                var selector = "";
                if (id) {
                    selector = "#" + id;
                }
                else if ($(this).attr("for")) {
                    selector =  "label[for='" + $(this).attr("for") + "']";
                }
                else {
                    var parentId = $(this).closest("[id]").attr("id");
                    selector = "#" + parentId;
                    switch (parentId) {
                        case "entry-pref-field-list":
                        case "metadata_fields-field":
                            selector += " " + tagName + ":contains('" + $.trim(text) + "')";
                            break;
                        default:
                            $(selector).find(tagName).each(function(idx){
                                if ($(this).text() === text) {
                                    selector += " " + tagName + ":eq(" + idx + ")";
                                }
                            });
                            break;
                    }
                }
                res.push('["' + selector + '", "' + text + '", "' + text + '"]');
            });
        }
    };
    // end - $.MTAppGetLabel


    /**
     * カテゴリによって表示するフィールドを切り替えます。`MTAppOtherTypeCategories` を適用してからご利用ください。
     *
     * Updated: 2019/11/29
     *
     * @param {Object} options
     * @param {Object} options.selector カテゴリIDにcatという接頭辞を付けて、そのカテゴリが選択された時に表示させる要素のセレクタをカンマ区切りで指定します。
     * @param {Object} options.basename カテゴリIDにcatという接頭辞を付けて、そのカテゴリが選択された時に表示させるフィールドのベースネームをカンマ区切りで指定します。
     * @constructor
     */
    $.MTAppCategorySwitch = function(options){

        const op = $.extend({
          // カテゴリIDにcatという接頭辞を付けて、そのカテゴリが選択された時に表示させる要素のセレクタをカンマ区切りで指定します。
          // selector: {
          //     'cat1': '#title-field,#text-field,#customfield_foo-field',
          //     'cat2': '#title-field,#keywords-field,#excerpt-field',
          //     'init': '#title-field,#text-field,#excerpt-field'
          // },
          selector: null,
          // カテゴリIDにcatという接頭辞を付けて、そのカテゴリが選択された時に表示させるフィールドのベースネームをカンマ区切りで指定します。
          // basename: {
          //     'cat1': 'title,text,customfield_foo',
          //     'cat2': 'title,keywords,excerpt'
          //     'init': ''
          // },
          basename: null
        }, options);

        if (mtappVars.screen_id !== 'edit-entry' || (op.selector === null && op.basename === null)) {
            return;
        }

        $('body').addClass('MTAppCategorySwitch');
        const makeSelectorIntoObject = function(prop, value, intoHash, intoArray, basename){
            intoHash[prop] = [];
            if (value === '') {
                return;
            }
            const array = value.split(',');
            for (let i = 0, l = array.length; i < l; i++) {
                if (basename) {
                    const selector = '#' + array[i].replace(/^c:/, 'customfield_') + '-field';
                    intoHash[prop].push(selector);
                    intoArray.push(selector);
                } else {
                    intoHash[prop].push(array[i]);
                    intoArray.push(array[i]);
                }
            }
        };

        // 対象とするフィールド一覧を作成
        const targetSelector = [];
        const settingSelector = {};
        if (op.selector !== null) {
            for (let prop in op.selector) {
                makeSelectorIntoObject(prop, op.selector[prop], settingSelector, targetSelector, false);
            }
        } else if (op.basename !== null) {
            for (let prop in op.basename) {
                makeSelectorIntoObject(prop, op.basename[prop], settingSelector, targetSelector, true);
            }
        }
        targetSelector.sort();
        $.unique(targetSelector);

        // 対象とするフィールドを全て取得してクラスをつける
        const $target = $( targetSelector.join(',') ).addClass('hidden cfs-hidden');

        const showFields = function($obj){
            $obj.removeClass('hidden cfs-hidden').addClass('cfs-show').show();
        };

        const switchCategoryAction = function(){
            const selectedCategoriesValue = $('#category-ids').val();
            const selectedCategories = selectedCategoriesValue !== '' ? selectedCategoriesValue.split(',') : ['init'];
            if (selectedCategoriesValue === '' && settingSelector.hasOwnProperty('init') && settingSelector['init'].length < 1) {
                showFields($target);
            } else {
                $target.addClass('hidden cfs-hidden');
            }
            for (let i = 0, l = selectedCategories.length; i < l; i++) {
                var category = selectedCategories[i] === 'init' ? 'init' : 'cat' + selectedCategories[i];
                if (!settingSelector.hasOwnProperty(category)) {
                    continue;
                }
                for (let x = 0, y = settingSelector[category].length; x < y; x++) {
                    showFields( $(settingSelector[category][x]) );
                }
            }
        };
        $(document).on('click.MTAppCategorySwitch', '#other-type-category-list', switchCategoryAction);
        $('#category-selector').on('click.MTAppCategorySwitch', switchCategoryAction);
        switchCategoryAction();
    };


    /**
     * カテゴリごとに処理を設定できます。
     *
     * Updated: 2019/03/27
     *
     * @param {Object} options
     * @param {String} options.categories カテゴリIDを指定します。複数の場合はカンマ区切りで指定します。
     * @param {Function} options.code 実行したい関数をセットします。関数には選択されているカテゴリIDが引数として渡されます。
     * @returns {*}
     * @constructor
     */
    $.MTAppInCats = function(options){
        const op = $.extend({
          categories: '',
          code: function(id){ return; }
        }, options);

        const eventType = 'mtappCategoryChanged.' + mtapp.temporaryId(false);

        // 関数の中で条件分岐したい場合
        if (op.categories === null) {
            $('#category-ids').on(eventType, function (event) {
                const selectedCategories = event.target.value === '' ? [] : event.target.value.split(',');
                op.code(selectedCategories);
            }).trigger(eventType);
            return;
        }
        // オプションで指定したカテゴリIDを取得
        let cats = [];
        cats = op.categories.replace(/[^0-9,]/g, '').split(',');
        if (cats.length < 1) {
            return;
        }

        $('#category-ids').on(eventType, function (event) {
            const selectedCategories = event.target.value === '' ? [] : event.target.value.split(',');
            for (let i = 0; i < cats.length; i++) {
                if ($.inArray(cats[i], selectedCategories) !== -1) {
                    op.code(cats[i]);
                    return cats[i];
                }
            }
        }).trigger(eventType);
    };
    // end - $.MTAppInCats();


    /**
     * 記事カテゴリ選択のUIをラジオボタンまたはドロップダウンリストに変更します。
     *
     * Updated: 2018/07/03
     *
     * @param {Object} options
     * @param {String} options.type A string of the new widget type. You can set either "radio" or "select".
     * @param {String} options.label A string of the widget name.
     * @param {String} options.notSelectedText A string to be displayed when no category is selected.
     * @param {Number} options.selected Set the category ID to "selected" option if you would like to select the specific category.
     * @param {Boolean} options.disabledExceptSelected Set true to "disabledExceptSelected" option if you would like to disable categories expecting the selected category.
     * @param {Boolean} options.hiddenExceptSelected Set true to "hiddenExceptSelected" option if you would like to hide categories expecting the selected category.
     * @param {Boolean} options.add Set true to "add" option if you would like to be able to add a new category.
     * @param {Boolean} options.nest Set true to "nest" option if you would like to nest categories. (Only radio type)
     * @param {Boolean} options.debug If set to true, the original widget is shown.
     * @constructor
     */
    $.MTAppOtherTypeCategories = function(options){

        const op = $.extend({
          type: 'radio',
          label: 'カテゴリ',
          notSelectedText: '未選択',
          selected: null,
          disabledExceptSelected: false,
          hiddenExceptSelected: false,
          add: false,
          nest: false,
          debug: false
        }, options);

        /* ==================================================
            L10N
        ================================================== */
        const l10n = {};
        if (mtappVars.language === 'ja') {
            l10n.add = '追加';
            l10n.addMessage = '追加するカテゴリのラベルを入力してください';
        }
        else {
            l10n.add = 'Add';
            l10n.addMessage = "Please enter a new category's label";
        }
        if (op.l10n) {
            $.extend(l10n, op.l10n);
        }
        /*  L10N  */

        if (mtappVars.type !== 'entry' && mtappVars.screen_id !== 'edit-entry' && mtappVars.type !== 'page' && mtappVars.screen_id !== 'edit-page') {
            return;
        }

        const _MTAppOtherTypeCategories = setInterval(function(){
            // Confirm the existance of the category selector
            if ($('#category-selector-list div.list-item').length > 0) {
                clearInterval(_MTAppOtherTypeCategories);
            }
            else {
                return;
            }
            // Make the other type category container
            const newCategoryWidgetHtml = mtapp.makeWidget({
                label: op.label,
                content: '<div id="other-type-category-list"></div>',
                action: (op.add) ? '<a id="other-type-category-add" href="#" class="btn btn-default pull-right">' + l10n.add + '</a>' : ''
            });
            // Insert it next the category widget
            $('#category-field').after(newCategoryWidgetHtml);
            // Add a click event to a#other-type-category-add
            $('#other-type-category-add').on('click', function(){
                const newCatLabel = prompt(l10n.addMessage, '');
                if (newCatLabel) {
                    mtapp.loadingImage('show');
                    $.ajax({
                        url: CMSScriptURI,
                        data: {
                            __mode: 'js_add_category',
                            magic_token: document.getElementById('m_t').value,
                            blog_id: mtappVars.blog_id,
                            parent: 0, //parseInt( this.parentID ),
                            _type: 'category',
                            label: newCatLabel
                        },
                        type: 'POST'
                    }).done(function(response){
                        if (response.error) {
                            $.errorMessage('MTAppOtherTypeCategories', response.error, 'alert');
                        }
                        const newCatId = response.result.id;
                        switch (op.type) {
                            case 'radio':
                                $anotherCategoryList.find('label:first').after(
                                    '<div class="form-check form-check-inline">' +
                                    '<input class="form-check-input" type="radio" name="other-type-category" id="another-cat-' + newCatId + '" value="' + newCatId + '" checked="checked">' +
                                    '<label class="form-check-label" for="another-cat-' + newCatId + '">' + newCatLabel + '</label>' +
                                    '</div>'
                                );
                                break;
                            case 'select':
                                $anotherCategoryList.find('option:first').after(
                                    '<option value="' + newCatId + '" selected>' + newCatLabel + '</option>'
                                );
                                break;
                            default: return false;
                        }
                        $('#category-ids').val(newCatId);
                        mtapp.loadingImage('hide');
                    }).fail(function(){
                        $.errorMessage('MTAppOtherTypeCategories', 'Adding category failed', 'alert');
                        mtapp.loadingImage('hide');
                    });
                }
                return false;
            });
            const $anotherCategoryList = $('#other-type-category-list');
            // $(window).load(function(){
                if (!op.debug) {
                    $('#category-field').addClass('d-none');
                }
                const radioCatList = [];
                $('#category-selector-list div.list-item').each(function(i){
                    let categoryIds = $('#category-ids').val();
                    let $div = $(this).children().children('div');
                    let catLabel = $div.find('label').text().replace(/\s/g, '');
                    let catId = $div.children('input').attr('name');
                    let attrDefChecked = '';
                    let attrChecked = '';
                    let attrDisabled = '';
                    let attrHiddenClass = '';
                    let _html = [];
                    let marginLeft = '';
                    if (op.nest) {
                        marginLeft = ' style="margin-left:' + $(this).children().css('margin-left') + ';"';
                    }
                    if (catId) {
                        catId = catId.match(/[0-9]+$/)[0];
                    }
                    else {
                        return true;
                    }
                    switch (op.type) {
                        case 'radio':
                            if (categoryIds === '') {
                                if (op.selected === null) {
                                    attrDefChecked = ' checked="checked"';
                                } else {
                                    if (catId == op.selected) {
                                        attrChecked = ' checked="checked"';
                                    } else if (op.hiddenExceptSelected) {
                                        attrHiddenClass = ' class="hidden"';
                                    } else if (op.disabledExceptSelected) {
                                        attrDisabled = ' disabled="disabled"';
                                    }
                                }
                            } else {
                                if (categoryIds == catId) {
                                    attrChecked = ' checked="checked"';
                                } else if (op.hiddenExceptSelected) {
                                    attrHiddenClass = ' class="hidden"';
                                } else if (op.disabledExceptSelected) {
                                    attrDisabled = ' disabled="disabled"';
                                }
                            }
                            if (i == 0 && !op.selected) {
                                _html.push(
                                    '<div class="form-check form-check-inline">' +
                                    '<input class="form-check-input" type="radio" name="other-type-category" id="another-cat-0" value=""' + attrDefChecked + attrDisabled + '>' +
                                    '<label class="form-check-label" for="another-cat-0"' + attrHiddenClass + marginLeft + '>' + op.notSelectedText + '</label>' +
                                    '</div>'
                                );
                            }
                            _html.push(
                                '<div class="form-check form-check-inline">' +
                                '<input class="form-check-input" type="radio" name="other-type-category" id="another-cat-' + catId + '" value="' + catId + '"' + attrChecked + attrDisabled + '>' +
                                '<label class="form-check-label" for="another-cat-' + catId + '"' + attrHiddenClass + marginLeft + '>' + catLabel + '</label>' +
                                '</div>'
                            );
                            break;
                        case 'select':
                            if (categoryIds === '') {
                                if (op.selected === null) {
                                    attrDefChecked = ' selected="selected"';
                                } else {
                                    if (catId == op.selected) {
                                        attrChecked = ' selected="selected"';
                                    } else if (op.hiddenExceptSelected) {
                                        attrHiddenClass = ' class="hidden"';
                                    } else if (op.disabledExceptSelected) {
                                        attrDisabled = ' disabled="disabled"';
                                    }
                                }
                            } else {
                                if (categoryIds == catId) {
                                    attrChecked = ' selected="selected"';
                                } else if (op.hiddenExceptSelected) {
                                    attrHiddenClass = ' class="hidden"';
                                } else if (op.disabledExceptSelected) {
                                    attrDisabled = ' disabled="disabled"';
                                }
                            }
                            if (i == 0 && !op.selected) {
                                _html.push('<select name="other-type-category" class="form-control"><option value=""' + attrDefChecked + attrDisabled + attrHiddenClass + '>' + op.notSelectedText+ '</option>');
                            }
                            _html.push('<option value="' + catId + '"' + attrChecked + attrDisabled + attrHiddenClass + '>' + catLabel + '</option>');
                            break;
                        default: return false;
                    }
                    radioCatList.push(_html.join(''));
                });
                switch (op.type) {
                    case 'radio':
                        $anotherCategoryList.html(radioCatList.join(''));
                        $anotherCategoryList
                            .on('click', 'input[name="other-type-category"]', function(){
                                if ($(this).is(':checked')) {
                                    $('#category-ids').val($(this).val());
                                }
                                else {
                                    $('#category-ids').val('');
                                }
                            }).find('input[name="other-type-category"]:checked').trigger('click');
                        break;
                    case 'select':
                        $anotherCategoryList.html(radioCatList.join('') + '</select>');
                        $anotherCategoryList
                            .on('change', 'select', function(){
                                $('#category-ids').val($(this).find('option:selected').val());
                            }).find('select').trigger('change');
                        break;
                }
            // });
        }, 500);
    };


    // -------------------------------------------------
    //  $.MTApp1clickRebuild();
    //
    //  Description:
    //    テンプレートの管理画面でワンクリックで再構築できるようになる。
    //
    //  Usage:
    //    $.MTApp1clickRebuild();
    // -------------------------------------------------
    $.MTApp1clickRebuild = function(options){

        // ウェブサイトテンプレートの管理以外なら何もしない
        if (mtappVars.screen_id != 'list-template') return;

        // 「すべて再構築」ボタンとテーブルに再構築アイコンを設置
        $("#index-listing, #archive-listing").each(function(){
            var self = $(this),
                type = {
                    "name": self.find('div.listing-header h2').text(),
                    "id"  : self.attr('id')
                },
                // 公開ボタンを変数に入れておく
                publish = self.find('div.button-actions:eq(0) button:eq(0)');

            // インデックス、アーカイブテンプレートのすべて再構築ボタンを設置
            self
                .find('div.button-actions')
                    .prepend('<button class="button mtapp-1click-rebuild" title="' + type.name + 'をすべて再構築">すべて再構築</button>')
                    .find('button.mtapp-1click-rebuild')
                        .on('click', function(){
                            $(this)
                                .closest('div.actions-bar')
                                .siblings('table')
                                    .find('input:checkbox').prop('checked', true);
                            publish.trigger('click');
                            return false;
                        });
            // 再構築アイコンをテーブルに挿入
            self
                .find('#' + type.id + '-table')
                    .find('th.cb')
                        .insertListingColum('after', 'th', '再構築', 'rebuild')
                    .end()
                    .find('tbody')
                        .find('td.cb')
                            .insertListingColum('after', 'td', '<img class="mtapp-rebuild-icon" src="' + mtappVars.static_plugin_path + 'images/rebuild.png" width="13" height="13" />', 'rebuild')
                        .end()
                        .find('img.mtapp-rebuild-icon')
                            .each(function(){
                                var tmplName = $(this).closest('td').next().find('a').text();
                                $(this).attr('title',tmplName + ' を再構築する');
                            })
                            //.MTAppTooltip()
                            .on('click', function(){
                                $(this)
                                    .closest('td.rebuild')
                                        .prev('td.cb')
                                            .find('input:checkbox')
                                                .prop('checked', true);
                                publish.trigger('click');
                                return false;
                            });
        });
    };
    // end - $.MTApp1clickRebuild()


    // -------------------------------------------------
    //  $.MTAppCreateLink()
    // -------------------------------------------------
    $.MTAppCreateLink = function(options){
        var op = $.extend({}, $.MTAppCreateLink.defaults, options);
        var cgi = CMSScriptURI;
        switch (op.title) {
            case 'ユーザーダッシュボード':
                return cgi + '?__mode=dashboard';
            case 'ダッシュボード':
                return cgi + '?__mode=dashboard&blog_id=' + op.blog_id;
            default:
                return '';
        }
    };

    $.MTAppCreateLink.defaults = {
        title: '',
        blog_id: 0,
        id: 0
    };


    /**
     * 必要な数のカテゴリや指定したIDのカテゴリが選択されているかチェックし、選択されていない場合はエラーダイアログを表示する。
     *
     * updated: 2018/07/03
     *
     * @param {Object} options
     * @param {String} options.requiredIds 必須カテゴリIDをカンマ区切り
     * @param {Number} options.requiredCount 必須選択の数
     * @param {String} options.idErrorTitle 'エラー',
     * @param {String} options.idErrorContent '必須カテゴリが選択されていません。'
     * @param {String} options.countErrorTitle 'エラー',
     * @param {String} options.countErrorContent '必要な数のカテゴリが選択されていません。'
     * @constructor
     */
    $.MTAppHasCategory = function(options){

        const op = $.extend({
          requiredIds: '',
          requiredCount: 0,
          idErrorTitle: 'エラー',
          idErrorContent: '必須カテゴリが選択されていません。',
          countErrorTitle: 'エラー',
          countErrorContent: '必要な数のカテゴリが選択されていません。'
        }, options);

        const $form = $('form#entry_form');
        if ($form.length < 1) {
            return;
        }
        const type = mtappVars.type;
        if (!(type == 'entry' || type == 'page')){
            return;
        }
        const reqCats = (op.requiredIds) ? op.requiredIds.split(',') : [];
        const dialogOptions = {
            modal: true,
            callbacks: [{
                type: 'hide.bs.modal',
                action: function(){
                    $('button.btn-primary:disabled').prop('disabled', false);
                    $form.removeAttr('mt:once');
                }
            }]
        };

        $form.on('submit.MTAppHasCategory', function () {
            let isPreview = false;
            const _params = $(this).serializeArray();
            for (let i = 0, l = _params.length; i < l; i++) {
                if (_params[i].name === '__mode' && _params[i].value === 'preview_entry') {
                    isPreview = true;
                    break;
                }
            }
            if (! isPreview) {
                delete Editor.strings.unsavedChanges;
                $(window).off('beforeunload');
            }
            const categoryIds = $("input[name='category_ids']").val() ? $("input[name='category_ids']").val().split(',') : [];
            if (reqCats.length) {
                for (let i = 0, l = reqCats.length; i < l; i++) {
                    if ($.inArray(reqCats[i], categoryIds) == -1) {
                        dialogOptions.title = op.idErrorTitle;
                        dialogOptions.content = op.idErrorContent;
                        mtapp.modalMsg(dialogOptions);
                        return false;
                    }
                }
            }
            if (op.requiredCount && op.requiredCount > categoryIds.length) {
                dialogOptions.title = op.countErrorTitle;
                dialogOptions.content = op.countErrorContent;
                mtapp.modalMsg(dialogOptions);
                return false;
            }
            if (isPreview) {
                return true;
            }
            if (typeof window.indirectObjects !== 'undefined') {
                delete window.indirectObjects;
            }
            $(this).find('button.primary').prop('disabled', true);
            return true;
        });
    };


    /**
     * ブログ記事・ウェブページ一括編集画面をソート可能にして、日付を自動変更する
     *
     * Updated: 2018/07/03
     *
     * @param {Object} options
     * @param {String} options.target 自動変更する日付の種類を指定。公開日'created_on'または更新日'modified_on'
     * @param {String} options.interval 自動に減らしていく間隔を指定。1日:'day'、1時間'hour'、1分'minute'、1秒'second'。
     * @param {Boolean} options.targetSort modified_on での並べ替えを無効にする場合は false を指定。
     * @param {Function} options.update 並べ替えが完了したときのイベントを設定。function(ev, ui){}
     * @constructor
     */
    $.MTAppSortableBatchEdit = function(options){

        const op = $.extend({
          target: 'created_on',
          interval: 'day',
          targetSort: true,
          update: null
        }, options);

        if (mtappVars.screen_id.indexOf('batch-edit-') === -1) {
          return;
        }

        const interval = {
            year:   32140800000,
            month:  2678400000,
            day:    86400000,
            hour:   3600000,
            minute: 60000,
            second: 1000
        };

        if (typeof op.interval === 'undefined' || interval.hasOwnProperty(op.interval) == false) {
            op.interval = 'day';
        }

        const getDatetimeFormat = function(ts, itv){
            const date = new Date(ts);
            const res = {
                year:   date.getFullYear(),
                month:  mtapp.zeroPad(date.getMonth() + 1, 2),
                day:    mtapp.zeroPad(date.getDate(), 2),
                hour:   (itv === 'day') ? '00' : mtapp.zeroPad(date.getHours(), 2),
                minute: (itv === 'day' || itv === 'hour') ? '00' : mtapp.zeroPad(date.getMinutes(), 2),
                second: (itv === 'day' || itv === 'hour' || itv === 'minute') ? '00' : mtapp.zeroPad(date.getSeconds(), 2)
            };
            return res.year + '-' + res.month + '-' + res.day + ' ' + res.hour + ':' + res.minute + ':' + res.second;
        };
        if (op.targetSort == true && op.target === 'modified_on') {
            const currentList = [];
            $('#' + mtappVars.screen_id.replace(/batch-edit-/,'') + '-listing-table tbody tr').each(function(){
                const timeStr = $(this).find('td.datetime:eq(1) input:text').val().replace(/ /, 'T');
                const date = new Date(timeStr);
                const ts = date.getTime();
                currentList.push({ ts: ts, html: this.outerHTML });
            });
            $.objectSort(currentList, 'ts', 'descend', 'numeric');
            let tbodyHtml = '';
            for (let i = 0, l = currentList.length; i < l; i++) {
                tbodyHtml += currentList[i]['html'];
            }
            $('#' + mtappVars.screen_id.replace(/batch-edit-/,'') + '-listing-table tbody').get(0).innerHTML = tbodyHtml;
        }
        $('#' + mtappVars.screen_id.replace(/batch-edit-/,'') + '-listing-table')
            .find('tr')
                .css({'cursor':'move'})
            .end()
            .find('tbody')
                .sortable({
                    items: 'tr',
                    cursor: 'move',
                    placeholder: 'mtapp-state-highlight',
                    start: function(ev, ui){
                        $(ui.placeholder).height($(ui.item).height()).css('background-color', '#FFFBE6');
                    },
                    sort: function(ev, ui){
                        ui.item.css({
                            'background-color': '#F6F1E1',
                            'border': '1px solid #CACACA'
                        });
                    },
                    stop: function(ev, ui){
                        ui.item.css({
                            'background-color': 'inherit',
                            'border': 'none'
                        });
                    },
                    update: function(ev, ui){
                        if (typeof op.update == 'function') {
                            op.update(ev, ui);
                        } else if (op.target == 'created_on' || op.target == 'modified_on') {
                            const n = op.target == 'created_on' ? 0 : 1;
                            const date = new Date();
                            const ts = date.getTime();
                            $('#' + mtappVars.type + '-listing-table tbody tr').each(function(i){
                                const _ts = ts - ((i + 1) * (interval[op.interval] - 0));
                                $(this).find('td.datetime:eq(' + n + ') input:text').val(getDatetimeFormat(_ts, op.interval));
                            });
                        }
                    }
                });
    };


    /**
     * ブログ記事・ウェブページ一括編集画面でカテゴリやフォルダをまとめて変更する
     *
     * Updated: 2018/07/03
     *
     * @param {Object} options
     * @param {String} options.text ボタンに表示するテキスト
     * @constructor
     */
    $.MTAppBatchEditCategory = function(options){

        const op = $.extend({
          text: 'をまとめて変更'
        }, options);

        if (mtappVars.screen_id.indexOf('batch-edit-') < 0) return;
        const text = (mtappVars.screen_id == 'batch-edit-entry') ? 'カテゴリ' + op.text: 'フォルダ' + op.text;
        const $select = $('td.category').find('select');
        const $select_clone = $select.eq(0).clone().attr('id', 'mtapp_clone_select').addClass('ml-3');
        const $btn = $('<button class="btn btn-default ml-3" title="' + text + '">' + text + '</button>').on('click', function () {
            const value = $('#mtapp_clone_select').val();
            $select.each(function () {
                $(this).val(value);
            });
            return false;
        });
        $('#actions-bar-top')
            .find('button.primary')
                .after($btn)
                .after($select_clone);
    };


    // ---------------------------------------------------------------------
    //  $(foo).MTAppAssetsGallery();
    // ---------------------------------------------------------------------
    //                                             Latest update: 2017/03/21
    //
    //  MTAppJSONTable と MTAppAssetFields を組み合わせたギャラリー機能を提供します
    // ---------------------------------------------------------------------
    $.fn.MTAppAssetsGallery = function(options, words){
        var op = $.extend({}, $.fn.MTAppAssetsGallery.defaults, options);

        var language = mtappVars.language === 'ja' ? 'ja' : 'en';
        var words = words || {};
        var l10n = $.extend({}, $.fn.MTAppAssetsGallery.l10n[language], words);


        var MTAppAssetFieldsOptions = {
            assetType: op.galleryType,
            assetTypeLabel: op.galleryLabel || '',
            noConvert: false,
            debug: op.debug
        };

        var MTAppJSONTableOptionsDefault = {
            inputType: 'textarea', // 'textarea' or 'input'
            caption: null, // String: Table caption
            header: null, // Object: Table header
            headerOrder: [], // Array: Order of table header
            headerPosition: 'top',
            footer: false,
            items: null,
            itemsRootKey: 'items',
            edit: true,
            add: true,
            clear: true,
            cellMerge: false,
            sortable: true,
            optionButtons: null,
            cbAfterBuildSystem: function(cb, $container){
                $container
                    .find('td.asset textarea')
                    .not('.isMTAppAssetFields')
                    .MTAppAssetFields(MTAppAssetFieldsOptions);
            },
            cbBeforeAdd: null,
            cbAfterAddSystem: function(cb, $container){
                $container
                    .find('td.asset textarea')
                    .not('.isMTAppAssetFields')
                    .MTAppAssetFields(MTAppAssetFieldsOptions);
            },
            cbBeforeClear: null,
            cbAfterSelectRow: null,
            cbAfterSelectColumn: null,
            cbBeforeSave: null,
            cbAfterSave: null,
            nest: true,
            debug: op.debug
        };
        var MTAppJSONTableOptions = $.extend({}, MTAppJSONTableOptionsDefault, op.MTAppJSONTableOptions);

        return this.each(function(){
            var $this = $(this);
            // アイテム一括アップロード用のフィールドを追加
            $this.before('<div class="MTAppAssetsGallery"><textarea class="text full low"></textarea></div>');
            var $multiUploadContainer = $this.prevAll('.MTAppAssetsGallery').eq(0);
            var $multiUpload = $multiUploadContainer.find('textarea');
            // MTAppAssetFields を適用
            $multiUpload.MTAppAssetFields({
                assetType: op.galleryType,
                assetTypeLabel: op.galleryLabel,
                edit: false,
                noConvert: false,
                canMulti: true,
                debug: op.debug
            }, {
                select: l10n.select,
            });
            // Dialog が閉じられた時のコールバックを設定
            $multiUpload.on('MTAppDialogClosed', function(){
                if ($(this).val() === '') {
                    return false;
                }
                mtapp.loadingImage('show');
                var separator = '<form';
                var forms = $(this).val();
                forms = forms.split(separator);
                forms.shift();
                for (let i = 0, l = forms.length; i < l; i++) {
                    forms[i] = separator + forms[i];
                }
                var $container = $this.next('div.mtapp-json-table');
                // 空の行を取得
                var $emptyCells = $container.find('td.asset textarea.jsontable-input').filter(function(){
                    return $(this).val() === '';
                });
                var $addBtn = $container.find('a.jsontable-add-row');
                var l = forms.length - $emptyCells.length;
                for (let i = 0; i < l; i++) {
                    $addBtn.trigger('click');
                }
                // 空の行を再取得
                $emptyCells = $container.find('td.asset textarea.jsontable-input').filter(function(){
                    return $(this).val() === '';
                });
                // 空の行に <form> を入れて MTAppAssetFields を適用
                $emptyCells.each(function(){
                    var form = forms.shift();
                    $(this).val(form).trigger('convert').trigger('refreshHTML', ['force']);
                });
                mtapp.loadingImage('hide');
            });
            $multiUploadContainer.find('a.mtapp-open-dialog').on('click.MTAppAssetsGalleryMultiUpload', function(){
                mtappVars.MTAppObsDialog.callbackTargetSelector = '#' + $multiUpload.attr('id');
                mtappVars.MTAppObsDialog.obs();
            });
            $this.MTAppJSONTable(MTAppJSONTableOptions);
            return true;
        });
    };
    $.fn.MTAppAssetsGallery.l10n = {
        en: {
            select: ' Bulk Select',
        },
        ja: {
            select: 'を一括選択',
        }
    };
    $.fn.MTAppAssetsGallery.defaults = {
        galleryType: 'image', // 'image', 'file' or 'audio'
        galleryLabel: '',
        MTAppJSONTableOptions: {},
        debug: false
    };
    // end - $.MTAppAssetsGallery();


    // -------------------------------------------------
    //  $.MTAppGroupFilter(); (for PowerCMS)
    //
    //  Description:
    //    PowerCMSのグループ作成画面の左のカラムに検索フィルター機能を追加します。
    //
    //  Usage:
    //    $.MTAppGroupFilter(options);
    //
    // -------------------------------------------------
    $.MTAppGroupFilter = function(options) {
        if (!/group$/.test(mtappVars.screen_id) || $('#filter-select').length == 0) return;
        $('#filter-select').append('<input type="search" value="" id="mtapp-group-filter" placeholder="filter...">');
        $('#mtapp-group-filter').on('keyup', function(){
            var reg = new RegExp($(this).val(), 'i');
            $('#item-left div.object-listing-content li > span').each(function(){
                if (reg.test($(this).text())) {
                    $(this).parent().removeClass('hidden');
                } else {
                    $(this).parent().addClass('hidden');
                }
            });
        });
    };
    // end - $.MTAppGroupFilter();


    // -------------------------------------------------
    //  $.MTAppSnippetHelper(); (for PowerCMS)
    //
    //  Description:
    //    PowerCMSのスニペット・カスタムフィールドの新規作成を手助けする。
    //
    //  Usage:
    //    $.MTAppSnippetHelper();
    //
    // -------------------------------------------------
    // $.MTAppSnippetHelper = function(options) {
    //     if (mtappVars.screen_id != 'edit_field') return;
    //     var $helperBtn = $('<button class="button" id="mtapp-snippet-helper-action">スニペットヘルパー ON</button>').on('click', function(){
    //         $(this).addClass('hidden');
    //         _snippetHelper();
    //         if ($('#default:visible').length > 0) {
    //             _defaultHelper();
    //         }
    //         return false;
    //     });
    //     var type = $('#type').val();
    //     if (type == 'snippet') {
    //         $('#type-field div.field-content').append($helperBtn);
    //     } else {
    //         $('#type').change(function(){
    //             var _type = $(this).find('option:selected').val();
    //             if (_type == 'snippet') {
    //                 $('#type-field div.field-content').append($helperBtn);
    //             }
    //         });
    //     }

    //     function _snippetHelper() {
    //         var $options = $('#options').after('<button class="button" id="mtapp-snippet-make-options">連番オプション作成</button>');
    //         $('#mtapp-snippet-make-options').on('click', function(){
    //             var res = [];
    //             var optionsArry = $options.val().split(',');
    //             for (let i = 0, l = optionsArry.length; i < l; i++) {
    //                 optionsArry[i] = optionsArry[i].replace(/_[0-9]+$/, '');
    //             }
    //             optionsArry = $.unique(optionsArry);
    //             var to = prompt('連番の個数はいくつですか？', 10);
    //             for (let i = 0, l = optionsArry.length; i < l; i++) {
    //                 for (let x = 0; x < to; x++) {
    //                     res.push(optionsArry[i] + '_' + x);
    //                 }
    //             }
    //             $options.val(res.join(','));
    //             return false;
    //         });
    //     }
    //     function _defaultHelper() {
    //         var $options = $('#options');
    //         var $default = $('#default').after('<button class="button" id="mtapp-snippet-make-default">連番系ひな形作成</button>');
    //         $('#mtapp-snippet-make-default').on('click', function(){
    //             var resHasValue = '';
    //             var optionsCount = 0;
    //             var optionsAll = $options.val().split(',');
    //             var optionsFirst = optionsAll[0].replace(/_[0-9]+$/, '');
    //             var basename = $('#basename').val();
    //             var optionsUnique = [];
    //             for (let i = 0, l = optionsAll.length; i < l; i++) {
    //                 if (optionsAll[i].indexOf(optionsFirst) > -1) {
    //                     optionsCount++;
    //                 }
    //                 optionsUnique[i] = optionsAll[i].replace(/_[0-9]+$/, '');
    //             }
    //             optionsUnique = $.unique(optionsUnique);

    //             // for (let i = 0, l = optionsAll.length; i < l; i++) {
    //             //     res.push('<mt:SetVarBlock name="' + basename + '" key="' + optionsAll[i] + '"><mt:Var name="' + optionsAll[i] + '" /></mt:SetVarBlock>');
    //             // }
    //             var defaultVal = $default.val();
    //             if (defaultVal && confirm('現在の既定値を上書きしますか？')) {
    //                 var res = [];
    //                 var separator = "\n";

    //                 res.push('<div id="' + basename + '">');
    //                 for (let i = 0; i < optionsCount; i++) {
    //                     res.push([
    //                         '<div class="mtapp-sortable-item">',
    //                         '  <div class="mtapp-sortable-item-header"></div>',
    //                         '  <div class="mtapp-sortable-item-header">'
    //                     ].join(separator));
    //                     for (let x = 0, y = optionsUnique.length; x < y; x++) {
    //                         res.push('    <input type="text" id="' + optionsUnique[x] + '_' + i + '" name="' + optionsUnique[x] + '_' + i + '" value="<mt:Var name="' + optionsUnique[x] + '_' + i + '">">');
    //                     }
    //                     res.push([
    //                         '  </div>',
    //                         '</div>'
    //                     ].join(separator));
    //                 }
    //                 res.push('</div>');

    //                 // res.push('<mt:For var="i" from="0" to="' + (optionsCount - 1) + '">');
    //                 // for (let i = 0, l = optionsAll.length; i < l; i++) {
    //                 //     // res.push('<mt:SetVarBlock name="v_' + optionsAll[i] + '">' + optionsAll[i] + '_<mt:Var name="i" /></mt:SetVarBlock>');
    //                 //     var innerHTML = [
    //                 //     ];
    //                 //     res.push(innerHTML.join(''));
    //                 //     // resHasValue += '<mt:Var name="$v_' + optionsAll[i] + '">';
    //                 // }
    //                 // res.push('<mt:SetVarBlock name="has_value">' + resHasValue + '</mt:SetVarBlock>');
    //                 // res.push('<mt:If name="i" eq="0"><mt:SetVar name="has_value" value="1" /></mt:If>');
    //                 // res.push('</mt:For>');
    //                 $default.val(res.join(separator));
    //             }
    //             return false;
    //         });
    //     }
    // };
    // end - $.MTAppSnippetHelper();


    // -------------------------------------------------
    //  $(foo).MTAppSortableSnippet(); (for PowerCMS)
    //
    //  Description:
    //    「1項目ごとに改行してください」をGUIで実現します。(MT5.2 later)
    //
    //  Usage:
    //    $(foo).MTAppSortableSnippet(options);
    //
    //  Options:
    //    input_class: {String} 'sub-class1 sub-class2'
    //
    // -------------------------------------------------
    // $.fn.MTAppSortableSnippet = function(options) {
    //     var op = $.extend({}, $.fn.MTAppSortableSnippet.defaults, options);

    //     return this.each(function(){
    //         var $this = $(this);
    //         var $sortableItem = $this
    //             .find('.mtapp-sortable-item').css({
    //                 position: 'relative',
    //                 marginBottom: '10px',
    //                 paddingLeft: '20px'
    //             })
    //             .each(function(){
    //                 $(this)
    //                     .find('.mtapp-sortable-item-header')
    //                     .append('<img src="' + mtappVars.static_plugin_path + 'images/arrow-move.png" style="cursor:move;position:absolute;top:3px;left:0;">');
    //             });
    //         var $addBtn = $('<div style="text-align:right;"><button class="button" data-count="1">追加</button></div>')
    //             .find('button')
    //             .on('click', function(){
    //                 var $hiddenItem = $sortableItem.filter('.hidden:first').removeClass('hidden');
    //                 if ($hiddenItem.next('.mtapp-sortable-item').length == 0) {
    //                     $(this).addClass('hidden');
    //                 }
    //                 return false;
    //             })
    //             .end();
    //         $this.append($addBtn);
    //         $this.sortable({
    //             items: '.mtapp-sortable-item',
    //             cursor: 'move',
    //             stop: function(ev, ui){
    //                 $(ui.item).siblings().andSelf().each(function(i){
    //                     $(this).find('.mtapp-item-data').each(function(){
    //                         var n = this.name.replace(/(.+_)[0-9]+$/, '$1' + i);
    //                         $(this).attr('name', n);
    //                     });
    //                 });
    //             }
    //         });
    //     });
    // };
    // $.fn.MTAppSortableSnippet.defaults = {
    //     limit: 10
    // };
    // end - $(foo).MTAppSortableSnippet();


    // ---------------------------------------------------------------------
    //  $.MTAppGoogleMapFields();
    // ---------------------------------------------------------------------
    //                                             Latest update: 2017/07/03
    //                                             Author: BUN（https://github.com/dreamseeker）
    //
    //  表示中の Google マップから座標を取得します。
    // ---------------------------------------------------------------------
    $.MTAppGoogleMapFields = function(options) {
        var op = $.extend({}, $.MTAppGoogleMapFields.defaults, options);
        if(mtappVars.screen_id !== 'edit-entry' || op.basename === null){
            return;
        }

        var selector      = (op.custom) ? 'customfield_' + op.basename : op.basename,
            $mapCodeField = $('#' + selector),
            $mapContainer = $('#' + selector + '-field');

        // 地図用のコンテナをセット
        $mapContainer
            .after('<div id="' + selector + '_gmap"></div>');

        // 地図座標のフィールドを非表示
        $mapCodeField.hide();

        // 座標関連の変数を初期化
        var _saved_pos = $mapCodeField.val(),
            _map_pos   = (_saved_pos !== '') ? _saved_pos.split(',') : op.mapPosition,
            _lat       = parseFloat(_map_pos[0]),
            _lng       = parseFloat(_map_pos[1]),
            _zoom      = parseInt(_map_pos[2]);

        var mapMarker,
            mapCanvas,
            mapGeocoder,
            $map    = $('#' + selector + '_gmap'),
            mapOpts = {
                zoom            : _zoom,
                center          : new google.maps.LatLng(_lat, _lng),
                mapTypeId       : google.maps.MapTypeId.ROADMAP,
                scrollwheel     : false,
                zoomControl     : true,
                disableDefaultUI: true
            };

        // マーカーのセット
        var refreshMarker = function(){
            mapMarker = new google.maps.Marker({
                position: mapCanvas.getCenter(),
                map     : mapCanvas
            });
        };

        // フィールドに座標をセット
        var refreshMapCode = function(){
            var _pos   = mapCanvas.getCenter(),
                _array = [_pos.lat(), _pos.lng(), mapCanvas.getZoom()];

            $mapCodeField.val(_array.join(','));
        };

        // 住所やランドマークから座標を取得
        var geocodeSearch = function(){
            var address_label      = $(op.address).closest('.field').find('.field-header > label').text(),
                $targetFieldHeader = $mapCodeField.closest('.field').find('.field-header');

            $targetFieldHeader.append('<a href="#" class="button update-map">「' + address_label + '」から地図を表示</a>');

            $targetFieldHeader.find('.update-map').on('click', function(e){
                e.preventDefault();
                var _query = $(op.address).val();

                if(mapGeocoder){
                    mapGeocoder.geocode({ 'address': _query }, function(_results, _status){
                        if(_status == google.maps.GeocoderStatus.OK){
                            mapCanvas.setCenter(_results[0].geometry.location);
                            mapMarker.setPosition(_results[0].geometry.location);
                        } else if(_status == google.maps.GeocoderStatus.ERROR){
                            alert('サーバとの通信時に何らかのエラーが発生しました。');
                        } else if(_status == google.maps.GeocoderStatus.INVALID_REQUEST){
                            alert('GeocoderRequestに誤りがあります。');
                        } else if(_status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT){
                            alert('クエリ送信の制限回数を超えました。時間を空けて検索してください。');
                        } else if(_status == google.maps.GeocoderStatus.REQUEST_DENIED){
                            alert('ジオコーダの利用が許可されていません。');
                        } else if(_status == google.maps.GeocoderStatus.UNKNOWN_ERROR){
                            alert('未知のエラーに遭遇しました。');
                        } else if(_status == google.maps.GeocoderStatus.ZERO_RESULTS){
                            alert('検索結果が見つかりませんでした。キーワードを変えて検索してください。');
                        } else {
                            alert(_status);
                        }
                    });
                }
            });
        };

        var loadGoogleMap = function(){
            // 地図の表示サイズをセット
            $map.css({
                width: op.mapWidth,
                height: op.mapHeight,
                marginBottom: '15px'
            });

            // 地図座標のフィールドのマージンをリセット
            $mapContainer.css({
                marginBottom: 0
            });

            // 地図・マーカーの表示
            mapCanvas = new google.maps.Map($map[0], mapOpts);
            refreshMarker();

            // イベント：中心座標が変わったらマーカーを再描画
            google.maps.event.addListener(mapCanvas, 'center_changed', function(){
                mapMarker.setMap(null);
                refreshMarker();
            });

            // イベント：アイドル状態になったら座標を再セット
            google.maps.event.addListener(mapCanvas, 'idle', function(){
                refreshMapCode();
            });
        };

        loadGoogleMap();

        // 住所欄と連携していれば、ジオコーディングを有効化
        if(op.address !== null){
            mapGeocoder = new google.maps.Geocoder();
            geocodeSearch();
        }

        // デバッグモードなら、ターゲットのフィールドを表示させる
        if(op.debug){
            $mapCodeField.show();
        }
    };
    $.MTAppGoogleMapFields.defaults = {
        basename   : null,
        custom     : null,
        address    : null,
        debug      : false,
        mapPosition: [35.68118333426901,139.76734411475218,14],
        mapWidth   : '100%',
        mapHeight  : '400px'
    };
    // end - $.MTAppGoogleMapFields();


    // -------------------------------------------------
    //  Utilities
    // -------------------------------------------------
    $.fn.extend({
        insertListingColum: function(position, element, html, classname){
            return this.each(function(){
                var elem = '';
                classname = classname ? ' ' + classname : '';
                if (element == 'th') {
                    elem = '<th class="col head' + classname + '"><span class="col-label">' + html + '</span></th>';
                } else if (element == 'td') {
                    elem = '<td class="col' + classname + '">' + html + '</td>';
                }
                $(this)[position](elem);
            });
        }
    });

    $.extend({
        // 1桁の整数の場合、頭に0を付ける
        digit: function(num, space) {
            var prefix = (space) ? ' ' : '0';
            num += '';
            return (num.length < 2) ? prefix + num: num;
        },
        // 指定した桁数に満たない場合は頭を0で埋める
        zeroPad: function(num, pad) {
            num = num.toString();
            while (num.length < pad) {
                num = '0' + num;
            }
            return num;
        },
        // 全角数字を半角数字に変換し、半角数字以外は削除する。
        toInt: function(str, allow) {
            str = str + "";
            str = str.replace(/０/g, '0')
                     .replace(/１/g, '1')
                     .replace(/２/g, '2')
                     .replace(/３/g, '3')
                     .replace(/４/g, '4')
                     .replace(/５/g, '5')
                     .replace(/６/g, '6')
                     .replace(/７/g, '7')
                     .replace(/８/g, '8')
                     .replace(/９/g, '9');
            if (!allow) {
                str = str.replace(/\D/g, '');
            }
            return str;
        },
        // 数字を3桁ごとにカンマで区切る
        errorMessage: function(methodName, message, output, returnValue) {
            if (!output) {
                output = null;
            }
            var text = 'You have an error in ' + methodName + ': ' + message;
            switch (output) {
                case 'alert':
                    alert(text);
                    break;
                case 'console':
                    if (this.console && typeof console.log != "undefined"){
                        console.log(text);
                    }
                    break;
            }
            if (typeof returnValue === 'boolean') {
                return returnValue;
            }
            return text;
        },
        objectSort: function(array, key, order, type) {
            order = (order === 'ascend') ? -1 : 1;
            array.sort(function(obj1, obj2){
                var v1 = obj1[key];
                var v2 = obj2[key];
                if (type === 'numeric') {
                    v1 = v1 - 0;
                    v2 = v2 - 0;
                }
                else if (type === 'string') {
                    v1 = '' + v1;
                    v2 = '' + v2;
                }
                if (v1 < v2) {
                    return 1 * order;
                }
                if (v1 > v2) {
                    return -1 * order;
                }
                return 0;
            });
        }
    });

    function getFieldID(basename) {
        return basename.replace(/\s/g,'').replace(/^c:/,'customfield_').replace(/^cf_/,'customfield_') + '-field';
    }

    // end - Utility

    /**********************************************
     *
     *  削除予定の非推奨メソッド
     *
     **********************************************/
    // -------------------------------------------------
    //  $(foo).MTAppLineBreakField(); - 削除予定
    //
    //  Updated: 2018/06/28
    //
    //  Description:
    //    「1項目ごとに改行してください」をGUIで実現します。(MT5.2 later)
    //
    //  Usage:
    //    $(foo).MTAppLineBreakField(options);
    //
    //  Options:
    //    input_class: {String} 'sub-class1 sub-class2'
    //
    // -------------------------------------------------
    $.fn.MTAppLineBreakField = function(options) {
        console.warn('MTAppLineBreakField は非推奨です。今後のバージョンで削除される予定です。');
        var op = $.extend({
          inputClass: 'text full',
          sortable: true
        }, options);

        var inputClass = op.inputClass ? op.inputClass : op.input_class;
        var isSortable = op.sortable;
        return this.each(function(){
            var $this = $(this).hide();
            var this_id = $this.attr('id')
            var this_value = $this.val().split('\n');
            var $fieldContent = $this.parent();

            var input = [];
            for (let i = 0, n = this_value.length; i < n; i++) {
                input.push(item(this_value[i]));
            }
            $this.after(input.join(''));

            $fieldContent.on('click', 'img.mtapp-linebreak-field-add', function(){
                $(this).parent().parent().after(item('')).next().children().children().trigger('focus');
            });
            $fieldContent.on('blur', 'input.mtapp-linebreak-field-input', function(){
                var text = [];
                var inputs = $fieldContent.find('input.mtapp-linebreak-field-input');
                var inputs_count = inputs.length;
                inputs.each(function(){
                    if ($(this).val() != '') {
                        text.push($(this).val());
                    } else if (inputs_count > 1) {
                        $(this).parent().parent().remove();
                    }
                });
                $this.val(text.join("\n"));
            });
            $fieldContent.on('keydown', 'input.mtapp-linebreak-field-input', function(e){
                var keycode = e.which || e.keyCode;
                if (keycode == 13) {
                    $(this).trigger('blur').next().trigger('click');
                    return false;
                }
            });
            if (isSortable) {
                $fieldContent.addClass('mtapp-sortable').sortable({
                    update: function(e, ui){
                        $(ui.item).find('input').trigger('blur');
                    }
                });
            }

            function item (val) {
                return [
                    '<span class="mtapp-linebreak-field-item form-inline">',
                        '<span class="mtapp-linebreak-field-item-inner">',
                            '<input type="text" class="form-control mtapp-linebreak-field-input ' + inputClass + '" value="' + val + '" />',
                            '<img class="mtapp-linebreak-field-add" src="' + mtappVars.static_plugin_path + 'images/plus-circle.png" alt="plus" />',
                        '</span>',
                    '</span>'
                ].join('');
            }

        });
    };

    /**********************************************
     *
     *  削除されたメソッド
     *
     **********************************************/
    $.fn.MTAppCheckCategoryCount = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppCheckCategoryCount', 'v2.3.5', "$.MTAppHasCategory() をご利用ください。");
        });
    };
    $.fn.MTAppDynamicSelect = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppDynamicSelect', 'v2.0.0', ".mtapp('dynamicSelect', options) をご利用ください。");
        });
    };
    $.fn.MTAppSuggest = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppSuggest', 'v2.0.0', ".mtapp('suggest', options) をご利用ください。");
        });
    };
    $.fn.MTAppMaxLength = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppMaxLength', 'v2.0.0', ".mtapp('maxLength', options) をご利用ください。");
        });
    };
    $.fn.MTAppTaxAssist = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppTaxAssist', 'v2.0.0', ".mtapp('taxAssist', options) をご利用ください。");
        });
    };
    $.fn.MTAppNumChecker = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppNumChecker', 'v2.0.0', ".mtapp('numChecker', options) をご利用ください。");
        });
    };
    $.fn.MTAppDateAssist = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppDateAssist', 'v2.0.0', ".mtapp('dateAssist', options) をご利用ください。なお、 `gengo` オプションは廃止されました。");
        });
    };
    $.fn.MTAppInlineEdit = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppInlineEdit', 'v2.0.0', ".mtapp('inlineEdit', options) をご利用ください。");
        });
    };
    $.fn.MTAppshowHint = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppshowHint', 'v2.0.0', ".mtapp('showHint', options) をご利用ください。");
        });
    };
    $.fn.MTAppRemoveVal = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppRemoveVal', 'v2.0.0', ".mtapp('removeVal') をご利用ください。");
        });
    };
    $.fn.MTAppTabSpace = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppTabSpace', 'v2.0.0', ".mtapp('tabToSpace', options) をご利用ください。");
        });
    };
    $.fn.MTAppFancyListing = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppFancyListing', 'v2.0.0', 'MTAppListing をご利用ください。');
        });
    };
    $.fn.MTAppTooltip = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppTooltip', 'v2.0.0', ".mtapp('tooltip', options) をご利用ください。");
        });
    };
    $.fn.MTAppFieldSplit = function(){
        return this.each(function(){
            MTAppRemovedMessage('MTAppFieldSplit', 'v2.0.0', ".mtapp('fieldSplit', options) をご利用ください。");
        });
    };
    $.fn.multicheckbox = function(){
        return this.each(function(){
            MTAppRemovedMessage('multicheckbox', 'v2.0.0', ".mtapp('multiCheckbox', options) をご利用ください。");
        });
    };
    $.MTAppSetLabel = function(){
        MTAppRemovedMessage('MTAppSetLabel', 'v2.0.0', "");
    };
    $.MTAppTabs = function(){
        MTAppRemovedMessage('MTAppTabs', 'v2.0.0', "mtapp.tabs() をご利用ください。オプションの指定方法が変更されました。ドキュメントをご確認ください。");
    };
    $.MTAppMultiCheckbox = function(){
        MTAppRemovedMessage('MTAppMultiCheckbox', 'v2.0.0', ".mtapp('multiCheckbox', options) をご利用ください。");
    };
    $.varType = function(){
        MTAppRemovedMessage('varType', 'v2.0.0', "$.type() をご利用ください。");
    };
    $.MTAppSlideMenu = function(){
        MTAppRemovedMessage('MTAppSlideMenu', 'v2.0.0', "");
    };
    $.MTAppSlideMenuV2 = function(){
        MTAppRemovedMessage('MTAppSlideMenuV2', 'v2.0.0', "");
    };
    $.MTAppMoveToWidget = function(){
        MTAppRemovedMessage('MTAppMoveToWidget', 'v2.0.0', "mtapp.moveToWidget() をご利用ください。");
    };
    $.MTAppKeyboardShortcut = function(){
        MTAppRemovedMessage('MTAppKeyboardShortcut', 'v2.0.0', "");
    };
    $.MTAppFieldSort = function(){
        MTAppRemovedMessage('MTAppFieldSort', 'v2.0.0', "mtapp.fieldSort() をご利用ください。");
    };
    $.MTAppLoadingImage = function(){
        MTAppRemovedMessage('MTAppLoadingImage', 'v2.0.0', "mtapp.loadingImage() をご利用ください。");
    };
    $.MTAppDebug = function(){
        MTAppRemovedMessage('MTAppDebug', 'v2.0.0', "mtapp.debug() をご利用ください。");
    };
    $.MTAppDialogMsg = function(){
        MTAppRemovedMessage('MTAppDialogMsg', 'v2.0.0', "mtapp.modalMsg() をご利用ください。");
    };
    $.MTAppDuplicate = function(){
        MTAppRemovedMessage('MTAppDuplicate', 'v2.0.0', "mtapp.duplicate() をご利用ください。");
    };
    $.MTAppMakeWidget = function(){
        MTAppRemovedMessage('MTAppMakeWidget', 'v2.0.0', "mtapp.makeWidget() をご利用ください。");
    };
    $.MTAppMakeField = function(){
        MTAppRemovedMessage('MTAppMakeField', 'v2.0.0', "mtapp.makeField() をご利用ください。");
    };
    $.MTAppMsg = function(){
        MTAppRemovedMessage('MTAppMsg', 'v2.0.0', "mtapp.msg() をご利用ください。");
    };
    $.MTAppRemoveVal = function(){
        MTAppRemovedMessage('MTAppRemoveVal', 'v2.0.0', ".mtapp('removeVal') をご利用ください。");
    };
    $.MTAppFullscreen = function(){
        MTAppRemovedMessage('MTAppFullscreen', 'v2.0.0', 'エディタの全画面表示をご利用ください。');
    };
    $.temporaryId = function(){
        MTAppRemovedMessage('temporaryId', 'v2.0.0', "mtapp.temporaryId() をご利用ください。");
    };
    $.numberFormat = function(){
        MTAppRemovedMessage('numberFormat', 'v2.0.0', "mtapp.numberFormat() をご利用ください。");
    };

})(jQuery);

// getPageScroll() by quirksmode.com
function getPageScroll() {
    var xScroll, yScroll;
    if (self.pageYOffset) {
        yScroll = self.pageYOffset;
        xScroll = self.pageXOffset;
    } else if (document.documentElement && document.documentElement.scrollTop) {   // Explorer 6 Strict
        yScroll = document.documentElement.scrollTop;
        xScroll = document.documentElement.scrollLeft;
    } else if (document.body) {// all other Explorers
        yScroll = document.body.scrollTop;
        xScroll = document.body.scrollLeft;
    }
    return new Array(xScroll,yScroll);
}

// Adapted from getPageSize() by quirksmode.com
function getPageHeight() {
    var windowHeight
    if (self.innerHeight) {   // all except Explorer
        windowHeight = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
        windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
        windowHeight = document.body.clientHeight;
    }
    return windowHeight;
}
function setCookie(key, val, days){
    var cookie = escape(key) + "=" + escape(val);
    if(days != null){
        var expires = new Date();
        expires.setDate(expires.getDate() + days);
        cookie += ";expires=" + expires.toGMTString();
    }
    document.cookie = cookie;
}
function getCookie(key) {
    if(document.cookie){
        var cookies = document.cookie.split(";");
        for(var i=0; i<cookies.length; i++){
            var cookie = cookies[i].replace(/\s/g,"").split("=");
            if(cookie[0] == escape(key)){
                return unescape(cookie[1]);
            }
        }
    }
    return "";
}

function MTAppRemovedMessage (methodName, version, text) {
    text = typeof text === 'string' ? text : '';
    console.warn(methodName + ' は MTAppjQuery ' + version + ' で削除されました。' + text);
}
