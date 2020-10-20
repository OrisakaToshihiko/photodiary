/*!
 * MTAppjQuery.js
 *
 * Copyright (c) bit part LLC
 * https://bit-part/
 *
 * Since:   2010/06/22
 * Version: 2.5.1
 * Update:  2020/08/28
 *
 */
'use strict';

if (typeof mtappVars !== 'object') {
  const fatalErrorMessage = 'Fatal error occurred in MTAppjQuery: "mtappVars" is required.';
  alert(fatalErrorMessage);
}

// Data API を利用する場合はトークンを定期的に更新する
if (typeof mtappVars.DataAPI !== 'undefined') {
  const updateToken = function () {
    mtappVars.DataAPI.getToken(function (response) {
      if (response.error) {
        console.warn(response.error);
        return;
      }
    });
  };
  updateToken();
  setInterval(updateToken, (mtappVars.accessTokenTTL / 2 * 1000));
}

const BP = function () {};

(function ($, window, document, mtappVars) {

  BP.prototype = {

    snippet: {
      if_this_screen: function () {
        return "if (mtappVars.screen_id === '" + mtappVars.screen_id + "') {}";
      },
      if_this_screen_and_content_type: function () {
        return "if (mtappVars.screen_id === '" + mtappVars.screen_id + "' && mtappVars.content_type_id === " + mtappVars.content_type_id + ") {}";
      },
      if_this_content_data: function () {
        return "if (mtappVars.screen_id === '" + mtappVars.screen_id + "' && mtappVars.id === " + mtappVars.id + ") {}";
      }
    },

    /**
     * 特定の条件のみに実行したいときに利用します。
     * @param obj mtappVarsで定義されているプロパティと値をセット
     * @param callback 第一引数の値が全てが一致する場合に実行する関数
     */
    condition: function (obj, callback) {
      for (let prop in obj) {
        if (prop.indexOf('.') !== -1) {
          const deepProps = prop.split(/\./);
          let target;
          for (let i = 0, l = deepProps.length; i < l; i++) {
            if (i === 0) {
              target = mtappVars[deepProps[i]];
            }
            else {
              target = target[deepProps[i]];
            }
            if (typeof target === 'undefined') {
              return;
            }
          }
          if (target != obj[prop]) {
            return;
          }
        }
        else {
          if (typeof mtappVars[prop] === 'undefined' || mtappVars[prop] != obj[prop]) {
            return;
          }
        }
      }
      if (typeof callback === 'function') {
        callback();
      }
      return;
    },


    /**
     * コンテンツタイプの編集画面のフィールドをグループ化しグリッドデザインで段組にします。
     * @param options
     * @param options.group グループとフィールドの情報を持った配列
     * @param options.selector グループを挿入する起点となるノードのセレクタ
     * @param options.card グループの入れ物の種類を `card（初期値）` か `collapse` で指定
     * @param options.method `after（初期値）` `before` `prepend` `append` のいずれか
     * @param options.changeFormat false を指定するとフォーマットを変更できなくなる
     */
    columnGroup: function (options) {

      const base = this;

      const op = $.extend({
        group: [],
        selector: '',
        type: 'card',
        method: 'after',
        changeFormat: false
      }, options);

      if (mtappVars.mode !== 'view' && mtappVars.type !== 'content_data') {
        return;
      }

      if (op.method !== 'after'
        && op.method !== 'before'
        && op.method !== 'insertAfter'
        && op.method !== 'insertBefore'
        && op.method !== 'prepend'
        && op.method !== 'append') {
        return;
      }

      const $pointer = $(op.selector);

      if (typeof mtappVars.contentDataFields === 'undefined') {
        this.getContentDataFields();
      }

      if (op.method !== 'before' && op.method !== 'append') {
        op.group.reverse();
      }

      for (let i = 0, l = op.group.length; i < l; i++) {
        // グループのコンテナ要素を挿入
        const tempId = base.temporaryId();
        const groupKey = 'mtapp-column-group-' + op.group[i].key;
        const groupLabel = op.group[i].label;
        const groupFields = op.group[i].fields;
        $pointer[op.method]('<div id="' + tempId + '"></div>');
        if (op.method === 'after') {
          $pointer.addClass('mb-6');
        }
        else if (op.method === 'before') {
          $pointer.addClass('mt-6');
        }
        new Vue({
          el: '#' + tempId,
          template: '#mtapp-column-group-' + op.type + '-tmpl',
          data: {
            groupKey: groupKey,
            groupLabel: groupLabel
          }
        });

        // フィールドを移動
        const $groupBody = $('#' + groupKey + ' div.row');
        for (let x = 0, y = groupFields.length; x < y; x++) {
          if (mtappVars.contentDataFields['contentField' + groupFields[x].id]) {
            if (op.changeFormat === false) {
              mtappVars.contentDataFields['contentField' + groupFields[x].id].find('select.convert_breaks').parent().hide().parent().removeClass('mt-contentblock');
            }
            const $div = $('<div class="mtapp-group-column ' + groupFields[x].column + '"></div>').append(mtappVars.contentDataFields['contentField' + groupFields[x].id]);
            $groupBody.append($div);
          }
        }
      }

    },


    /**
     * コンテンツデータ編集画面のメインカラムのフィールドを取得して `mtappVars.contentDataFields` にセットします。
     * 取得したデータは `mtappVars.contentDataFields.contentField1` （ `1` はコンテンツフィールドの ID ）の形で取得できます。
     */
    getContentDataFields: function () {

      if (mtappVars.mode !== 'view' && mtappVars.type !== 'content_data') {
        return;
      }

      mtappVars.contentDataFields = {};

      $('#content_data > div.form-group').each(function () {
        const $this = $(this);
        let fieldId = 0;
        let contentFieldName = $this.find('[name^=content-field-]').first().attr('name');
        if (contentFieldName) {
          fieldId = contentFieldName.match(/content-field-(\d+).*/)[1];
        }

        if (fieldId === 0) {
          contentFieldName = $this.find('[name^=date-]').first().attr('name');
          if (contentFieldName) {
            fieldId = contentFieldName.match(/date-(\d+).*/)[1];
          }
        }

        if (fieldId === 0) {
          contentFieldName = $this.find('[name^=time-]').first().attr('name');
          if (contentFieldName) {
            fieldId = contentFieldName.match(/time-(\d+).*/)[1];
          }
        }

        if (fieldId === 0) {
          contentFieldName = $this.find('[name^=category-]').first().attr('name');
          if (contentFieldName) {
            fieldId = contentFieldName.match(/category-(\d+).*/)[1];
          }
        }

        if (fieldId === 0) {
          contentFieldName = $this.find('[id^=asset-field-]').first().attr('id');
          if (contentFieldName) {
            fieldId = contentFieldName.match(/asset-field-(\d+).*/)[1];
          }
        }

        if (fieldId === 0) {
          contentFieldName = $this.find('[id^=content-type-field-]').first().attr('id');
          if (contentFieldName) {
            fieldId = contentFieldName.match(/content-type-field-(\d+).*/)[1];
          }
        }

        if (fieldId !== 0) {
          mtappVars.contentDataFields['contentField' + fieldId] = $this;
          if ($this.attr('id')) {
            $this.addClass('contentField' + fieldId);
          }
          else {
            $this.attr('id', 'contentField' + fieldId);
          }
        }
        else if ($this.is('#data_label-field')) {
          mtappVars.contentDataFields['dataLabelField'] = $this;
        }
      });

    },


    /**
     * `コンテンツタイプの編集` 画面に `columnGroup` の設定を書き出す UI を追加します。
     */
    columnGroupSettingUI: function () {

      if (mtappVars.mode !== 'view' && mtappVars.type !== 'content_type') {
        return;
      }

      $('div.mt-mainContent--scrollable').append('<div id="mtapp-column-group-setting-wrapper"></div>');

      const columGroupSetting = new Vue({
        el: '#mtapp-column-group-setting-wrapper',
        template: '#mtapp-column-group-setting-tmpl',
        data: {
          settingJson: '',
          exportedFields: '',
          importedFields: '',
          importedContentTypeName: '',
          destinationGroup: '',
          movingFieldsId: [],
          visible: false,
          visibleExportFields: false,
          visibleImportFields: false,
          visibleMoveToListButton: false,
          visibleError: false,
          contentFields: null,
          contentFieldsGroups: []
        },
        methods: {
          // MTが書き出している window.fields のデータを複製
          cloneFields: function () {
            const data = this;
            data.visible =! data.visible;
            const json = JSON.parse(window.fields.toJSON());
            for (let i = 0, l = json.length; i < l; i++) {
              json[i].group = '';
              json[i].column = ' col-md-12 col-lg-6';
              json[i].isActive = '';
            }
            data.contentFields = json;
          },
          // 新規グループを追加
          addGroup: function () {
            const data = this;
            data.contentFieldsGroups.push({
              label: 'グループ名',
              key: 'group' + (data.contentFieldsGroups.length + 1),
              fields: [/*{ id: Number, column: String }*/]
            });
          },
          // 移動する予定のフィールドの ID を保持
          setMovingFieldsId: function (fieldIdx, id) {
            const data = this;
            id = id - 0;
            data.movingFieldsId.push(id);
            data.contentFields[fieldIdx].isActive =! data.contentFields[fieldIdx].isActive;
          },
          // フィールドをグループに入れる
          moveFields: function () {
            const data = this;
            if (!data.destinationGroup) {
              return;
            }
            for (let i = 0, l = data.contentFields.length; i < l; i++) {
              const id = data.contentFields[i].id - 0;
              if (data.movingFieldsId.indexOf(id) !== -1) {
                data.contentFields[i].group = '' + data.destinationGroup;
              }
            }
            data.movingFieldsId = [];
          },
          // 特定のグループに属するか判定
          isGroupField: function (groupKey, fieldGroupKey) {
            return groupKey === fieldGroupKey;
          },
          // グループからフィールドを削除
          removeField: function (fieldIdx) {
            const data = this;
            data.contentFields[fieldIdx].group = '';
            data.contentFields[fieldIdx].isActive = false;
          },
          // JSON を出力
          printSetting: function () {
            const data = this;
            for (let i = 0, l = data.contentFieldsGroups.length; i < l; i++) {
              const groupKey = data.contentFieldsGroups[i].key;
              data.contentFieldsGroups[i].fields = [];
              for (let x = 0, y = data.contentFields.length; x < y; x++) {
                if (data.contentFields[x].group === groupKey) {
                  data.contentFieldsGroups[i].fields.push({
                    id: data.contentFields[x].id,
                    column: data.contentFields[x].column
                  });
                }
              }
            }
            data.settingJson = data.contentFieldsGroups.toJSON();
          },
          // 出力した JSON から復元
          restoreSetting: function () {
            const data = this;
            data.contentFieldsGroups = JSON.parse(data.settingJson);
            for (let i = 0; i < data.contentFieldsGroups.length; i++) {
              const fields = data.contentFieldsGroups[i].fields;
              const groupKey = data.contentFieldsGroups[i].key;
              for (let j = 0; j < data.contentFields.length; j++) {
                const fieldId = data.contentFields[j].id - 0;
                for (let k = 0; k < fields.length; k++) {
                  if (fieldId === (fields[k].id - 0)) {
                    data.contentFields[j].group = groupKey;
                    data.contentFields[j].column = fields[k].column;
                  }
                }
              }
            }
          },
          exportFields: function () {
            const data = this;
            data.visibleExportFields =! data.visibleExportFields;
            const json = JSON.parse(window.fields.toJSON());
            for (let i = 0, l = json.length; i < l; i++) {
              for (let prop in json[i]) {
                if (prop !== 'order' && prop !== 'type' && prop !== 'options') {
                  delete json[i][prop]
                }
              }
              json[i].options.id = 'id:' + Math.random().toString(36).slice(-8);
            }
            data.exportedFields = JSON.stringify(json);
          },
          importFields: function () {
            this.visibleImportFields =! this.visibleImportFields;
          },
          visibleImportButton: function () {
            return this.importedContentTypeName !== '';
          },
          execImport: function () {
            const data = this;
            $.ajax({
              url: location.href.replace(/\?.*/g, ''),
              method: 'post',
              data: {
                __mode: 'save',
                blog_id: mtappVars.blog_id,
                magic_token: document.querySelector('[name="magic_token"]').value,
                return_args: '__mode=view&_type=content_type&blog_id=' + mtappVars.blog_id,
                _type: 'content_type',
                id: '',
                data: data.importedFields,
                name: data.importedContentTypeName,
                description: '',
                label_field: '',
                user_disp_option: 'on'
              }
            }).done(function () {
              data.visibleMoveToListButton = true;
            }).fail(function () {
              data.visibleError = true;
            });
          },
          moveToList: function () {
            location.href = location.href.replace(/\?.*/g, '?__mode=list&_type=content_type&blog_id=' + mtappVars.blog_id);
          }
        }
      });
    },


    /**
     * 柔軟に、かつ規則的にコンテンツを入力できるマルチフィールド
     * @param options
     */
    multiField: function (options) {
      const base = this;

      // methods を複製・定義
      const methods = $.extend({}, {
        getType: function (type) {
          const textType = ['text', 'email', 'url', 'tel', 'password', 'number', 'datepicker', 'date', 'time', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
          if (textType.indexOf(type) !== -1) {
            return 'text';
          }
        },
        up: function (i) {
          const array = this.items;
          if (array[i].updated) {
            array[i].updated++;
          }
          else {
            array[i].updated = 1;
          }
          if (array[i - 1].updated) {
            array[i - 1].updated++;
          }
          else {
            array[i - 1].updated = 1;
          }
          array.splice(i - 1, 2, array[i], array[i - 1]);
        },
        down: function (i) {
          const array = this.items;
          if (array[i].updated) {
            array[i].updated++;
          }
          else {
            array[i].updated = 1;
          }
          if (array[i + 1].updated) {
            array[i + 1].updated++;
          }
          else {
            array[i + 1].updated = 1;
          }
          array.splice(i, 2, array[i + 1], array[i]);
        },
        insert: function (i) {
          const base = this;
          Vue.set(base, 'insertPoint', i);
          $('#mtapp-mf-modal-' + base.id).modal().on('hidden.bs.modal', function () {
            Vue.set(base, 'insertPoint', -1);
          });
        },
        insertAbove: function () {
          const base = this;
          Vue.set(base, 'insertPointDirection', 0);
        },
        insertBelow: function () {
          const base = this;
          Vue.set(base, 'insertPointDirection', 1);
        },
        remove: function (i) {
          const base = this;
          mtapp.modalConfirm({
            type: 'warning',
            content: '削除しますか？',
            callback: function () {
              base.items.splice(i, 1);
            }
          });
        },
        add: function (field) {
          const base = this;
          if (base.maxBlocks && base.maxBlocks <= base.items.length) {
            mtapp.modalMsg({
              type: base.maxBlocksMessage.type,
              title: base.maxBlocksMessage.title,
              content: base.maxBlocksMessage.content.replace(/%maxblocks/gi, base.maxBlocks)
            });
            return;
          }
          const newItem = JSON.parse(Object.toJSON(field));
          newItem.id = mtapp.temporaryId();
          let data = newItem.data ? newItem.data : '';
          if (field.type === 'table') {
            data = JSON.parse('[' + Object.toJSON(field.options) + ']');
            for (let i = 0, l = data.length; i < l; i++) {
              for (let x = 0, y = data[i].length; x < y; x++) {
                data[i][x].id = mtapp.temporaryId();
              }
            }
          }
          else if (field.type === 'multi-column' || field.type === 'table-vertical-fixed') {
            data = JSON.parse(Object.toJSON(field.options));
            for (let i = 0, l = data.length; i < l; i++) {
              data[i].id = mtapp.temporaryId();
            }
          }
          else if (field.type === 'multi-column-content') {
            data = JSON.parse(Object.toJSON(field.options));
            for (let i = 0; i < data.length; i++) {
              for (let j = 0; j < data[i].length; j++) {
                data[i][j].id = mtapp.temporaryId();
              }
            }
          }
          else if (field.type === 'listing') {
            data = [];
          }
          newItem.data = data;

          base.addType = field.type;
          if (base.insertPoint !== -1) {
            base.items.splice((base.insertPoint + base.insertPointDirection), 0, newItem);
          }
          else {
            base.items.push(newItem);
          }
          base.insertPoint = -1;
        },
        radioName: function (item) {
          if (typeof item.id === 'undefined') {
            item.id = mtapp.temporaryId();
          }
          return item.id;
        },
        tableRowUp: function (itemIdx, rowIdx) {
          const array = this.items[itemIdx].data;
          array.splice(rowIdx - 1, 2, array[rowIdx], array[rowIdx - 1]);
        },
        tableRowDown: function (itemIdx, rowIdx) {
          const array = this.items[itemIdx].data;
          array.splice(rowIdx, 2, array[rowIdx + 1], array[rowIdx]);
        },
        tableRowRemove: function (itemIdx, rowIdx) {
          const base = this;
          mtapp.modalConfirm({
            type: 'warning',
            content: '削除しますか？',
            callback: function () {
              base.items[itemIdx].data.splice(rowIdx, 1);
            }
          });
        },
        tableRowAdd: function (itemIdx) {
          const row = JSON.parse(Object.toJSON(this.items[itemIdx].options));
          for (let i = 0; i < row.length; i++) {
            row[i]['id'] = mtapp.temporaryId();
          }
          this.items[itemIdx].data.push(row);
        },
        textInput: function (item) {},
        // コンポーネント : VueContentData
        vueContentDataSaved: function (item) {},
        vueListContentData: function (item) {}
      }, options.methods);
      delete options.methods;

      // watch を複製・定義
      const watch = options.watch ? $.extend({}, options.watch) : null;
      delete options.watch;

      const data = $.extend({
        debug: false,
        addType: '',
        showAddContainer: false,
        showAddFieldButton: true,
        showViewRawDataButton: false,
        showSortButton: true,
        showInsertButton: true,
        showRemoveButton: true,
        addFieldButtonLabel: 'フィールドを追加',
        insertPoint: -1,
        insertPointDirection : 0,
        items: [],
        minBlocks: 0,
        maxBlocks: 0,
        maxBlocksType: '',
        maxBlocksMessage: {
          type: 'warning',
          title: 'お知らせ',
          content: '<p class="mb-0"><strong>最大ブロック数は %maxblocks です。</strong></p>'
        },
        fieldGroups: [
          [
            {type: 'h1', label: '見出し H1'},
            {type: 'h2', label: '見出し H2'},
            {type: 'h3', label: '見出し H3'},
            {type: 'h4', label: '見出し H4'},
            {type: 'h5', label: '見出し H5'},
            {type: 'h6', label: '見出し H6'}
          ],
          [
            {type: 'text', label: '1行テキスト'},
            {type: 'email', label: 'Email'},
            {type: 'url', label: 'URL'},
            {type: 'tel', label: '電話番号'},
            {type: 'password', label: 'パスワード'},
            {type: 'number', label: '数値'},
            {type: 'datepicker', label: '日付'},
            {type: 'time', label: '時刻'},
            {type: 'textarea', label: '複数行テキスト', rows: 8},
            {type: 'code', label: 'コードブロック', rows: 4},
            {type: 'tinymce', label: 'リッチテキスト', rows: 8},
            {type: 'asset', label: 'ファイル', url: ''},
            {type: 'image', label: '画像', url: '', thumbnail: ''}
          ],
          [
            {
              type: 'contentData', label: 'コンテンツデータ', siteId: 1, contentTypeId: 1, radio: false, modalEdit: true, modalCreate: true, includeDraft: false, dataLabelName: 'title'
            }
          ],
          [
            {
              type: 'select', label: 'ドロップダウンリスト', options: [
                {label: 'リンゴ', data: 'apple'},
                {label: 'オレンジ', data: 'orange'},
                {label: 'キウィフルーツ', data: 'kiwi'}
              ]
            },
            {
              type: 'checkbox', label: 'チェックボックス', options: [
                {label: 'リンゴ', data: 'apple', checked: false},
                {label: 'オレンジ', data: 'orange', checked: false},
                {label: 'キウィフルーツ', data: 'kiwi', checked: false}
              ]
            },
            {
              type: 'radio', label: 'ラジオボタン', options: [
                {label: 'リンゴ', data: 'apple'},
                {label: 'オレンジ', data: 'orange'},
                {label: 'キウィフルーツ', data: 'kiwi'}
              ]
            },
            {
              type: 'table', label: '表', options: [
                {type: 'text', label: '1行テキスト'},
                {type: 'datepicker', label: '日付'},
                {type: 'time', label: '時刻'},
                {type: 'textarea', label: '複数行テキスト', rows: 1},
                {type: 'tinymce', label: 'リッチエディタ', rows: 8},
                {type: 'asset', label: 'ファイル', filename: ''},
                {type: 'image', label: '画像', filename: '', thumbnail: ''},
                {
                  type: 'select', label: 'ドロップダウンリスト', options: [
                    {label: 'リンゴ', data: 'apple'},
                    {label: 'オレンジ', data: 'orange'},
                    {label: 'キウィフルーツ', data: 'kiwi'}
                  ]
                },
                {
                  type: 'checkbox', label: 'チェックボックス', options: [
                    {label: 'リンゴ', data: 'apple'},
                    {label: 'オレンジ', data: 'orange'},
                    {label: 'キウィフルーツ', data: 'kiwi'}
                  ]
                },
                {
                  type: 'radio', label: 'ラジオボタン', options: [
                    {label: 'リンゴ', data: 'apple'},
                    {label: 'オレンジ', data: 'orange'},
                    {label: 'キウィフルーツ', data: 'kiwi'}
                  ]
                }
              ]
            },
            {
              type: 'table-vertical-fixed', label: '縦向き固定テーブル', options: [
                {type: 'text', label: '1行テキスト'},
                {type: 'datepicker', label: '日付'},
                {type: 'time', label: '時刻'},
                {type: 'textarea', label: '複数行テキスト', rows: 1},
                {type: 'tinymce', label: 'リッチエディタ', rows: 8},
                {type: 'asset', label: 'ファイル' },
                {type: 'image', label: '画像' },
                {
                  type: 'select', label: 'ドロップダウンリスト', options: [
                    {label: 'リンゴ', data: 'apple'},
                    {label: 'オレンジ', data: 'orange'},
                    {label: 'キウィフルーツ', data: 'kiwi'}
                  ]
                },
                {
                  type: 'checkbox', label: 'チェックボックス', options: [
                    {label: 'リンゴ', data: 'apple'},
                    {label: 'オレンジ', data: 'orange'},
                    {label: 'キウィフルーツ', data: 'kiwi'}
                  ]
                },
                {
                  type: 'radio', label: 'ラジオボタン', data: 'orange', options: [
                    {label: 'リンゴ', data: 'apple'},
                    {label: 'オレンジ', data: 'orange'},
                    {label: 'キウィフルーツ', data: 'kiwi'}
                  ]
                }
              ]
            }
          ],
          [
            {
              type: 'multi-column', label: '2段組リッチテキスト', options: [
                {type: 'tinymce', col: 6},
                {type: 'tinymce', col: 6}
              ]
            },
            {
              type: 'multi-column', label: '3段組テキスト', options: [
                {type: 'textarea', rows: 8, col: 4},
                {type: 'textarea', rows: 8, col: 4},
                {type: 'textarea', rows: 8, col: 4}
              ]
            },
            {
              type: 'multi-column-content', label: '2段組コンテンツ', options: [
                [
                  {type: 'text', label: '小見出し'},
                  {type: 'tinymce', label: '本文'}
                ],
                [
                  {type: 'text', label: '小見出し'},
                  {type: 'tinymce', label: '本文'}
                ]
              ]
            }
          ],
          [
            {type: 'textarea', label: '定型文（セミナー案内）', rows: 8, data:"日時：\n\n会場：\n\n参加費：\n\n申し込み期限："}
          // ],
          // [
          //   {
          //     type: 'listing', label: '関連商品', url: '', options: [
          //       {label: 'ID', data: 'id'},
          //       {label: '名前', data: 'name'}
          //     ]
          //   }
          ]
        ]

      }, options);

      const fieldId = data.id;
      let target = null;
      let savedData = '';
      let isRequired = false;

      // 記事・ウェブページに対応
      if (mtappVars.screen_id === 'edit-entry' || mtappVars.screen_id === 'edit-page') {
        target = document.getElementById(fieldId);
        if (!target) {
          return;
        }
        savedData = target.value;
        const $fieldBlock = $('#' + fieldId + '-field');
        if ($fieldBlock.hasClass('required')) {
          isRequired = true;
        }
        $fieldBlock.after('<div id="mtapp-mf-' + fieldId + '"></div>').remove();
      }
      // コンテンツデータ
      else {
        if (typeof mtappVars.contentDataFields === 'undefined' || typeof mtappVars.contentDataFields['contentField' + fieldId] === 'undefined') {
          return;
        }
        target = document.querySelector('[name="content-field-'  + fieldId + '"]');
        if (target.required) {
          isRequired = true;
        }
        savedData = target.value;
        target.value = '';
        mtappVars.contentDataFields['contentField' + fieldId].find('#block_editor_data').appendTo('#edit-content-type-data-form');
        mtappVars.contentDataFields['contentField' + fieldId].find('.modal-blockeditor').appendTo('#edit-content-type-data-form');
        mtappVars.contentDataFields['contentField' + fieldId].after('<div id="mtapp-mf-' + fieldId + '"></div>').hide().find('textarea').attr('name', '');
      }

      // 必須アイコンを付ける
      data.isRequired = isRequired;

      // 保存されているデータを変換
      if (savedData) {
        savedData = JSON.parse(savedData);
        data.items = JSON.parse(Object.toJSON(savedData.items));
      }

      // 仮IDをフィールドにセット
      for (let i = 0; i < data.items.length; i++) {
        if (typeof data.items[i].id === 'undefined') {
          data.items[i].id = base.temporaryId();
        }
      }

      // Vue インスタンスを作成
      mtappVars.multiField = mtappVars.multiField || {};
      mtappVars.multiField['field' + fieldId] = {
        app: null, options: null
      };

      mtappVars.multiField['field' + fieldId].app = new Vue({
        el: '#mtapp-mf-' + fieldId,
        template: '#mf-container-tmpl',
        data: data,
        // updated: function () {
        //   this.$nextTick(function () {
        //     console.warn('ビュー全体が再レンダリングされた後にのみ実行されるコード');
        //     console.warn(this);
        //   })
        // },
        mounted: function () {
          // body に各フィールドのイベントを付与
          $('body').on('focus.mtapp-mf-field-datepicker', 'input.mtapp-mf-field-datepicker', function () {
            if (!$(this).hasClass('hasDatepicker')) {
              $(this).datepicker({
                dateFormat: 'yy-mm-dd',
                dayNamesMin: ['日', '月', '火', '水', '木', '金', '土'],
                monthNames: ['- 01','- 02','- 03','- 04','- 05','- 06','- 07','- 08','- 09','- 10','- 11','- 12'],
                showMonthAfterYear: true,
                prevText: '&lt;',
                nextText: '&gt;',
                onSelect: function (changeDate, ev) {
                  this.dispatchEvent(mtappVars.eventInput);
                }
              });
            }
          });
        },
        updated: function () {
          if (typeof mtappVars.vueContentData === 'object') {
            for (let prop in mtappVars.vueContentData) {
              if (mtappVars.vueContentData[prop] === false) {
                this.$refs[prop].showSelectedDataLabel();
              }
            }
          }
        },
        computed: {
          setContentData: function () {
            const items = this.items;
            const data = { items: items };
            return Object.toJSON(data);
          },
          disabledAdd: function () {
            return (this.maxBlocks > 0 && this.maxBlocks <= this.items.length);
          }
        },
        methods: methods,
        watch: watch
      });
    },


    /**
     * ローディング画像の表示・非表示を切り替えます。
     * @param {String} type `show` or `hide`
     */
    loadingImage: function (type) {
      type = (type === 'show') ? 'block' : 'none';
      document.getElementById('mtapp-loading-image').style.display = type;
      return;
    },


    /**
     * 指定した桁数に満たない場合は頭を0で埋めます。
     * @param n {number} 数値
     * @param l {number} 長さ
     * @param p {string} 埋める文字列。初期値は '0'。
     * @returns {string}
     */
    zeroPad: function (n, l, p) {
      p = typeof p === 'string' ? p : '0';
      return (Array(l).join(p) + n).slice(-l);
    },


    /**
     * 前後の空白文字と指定した文字の前後の空白を取り除き、指定した文字できれいに区切られた文字列にします。
     *
     * @param {String} text
     * @param {String} separater
     * @returns {string}
     */
    tidySeparater: function (text, separater) {
      separater = separater || ',';
      const pattern = new RegExp('[\\s　]*' + separater + '[\\s　]*', 'g');
      return text.replace(/^[\s　]+|[\s　]+$/g, '').replace(pattern, separater);
    },


    /**
     * 全角数字を半角数字に変換し、半角数字以外は削除します。
     * @param str 文字列
     * @param allow Boolean
     * @returns {string | *}
     */
    toInt: function (str, allow) {
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


    /**
     * 数字を3桁ごとにカンマで区切る書式にします。
     * @param num
     * @returns {string}
     */
    numberFormat: function (num) {
      num = '' + num;
      var numArray = (num.indexOf('.') !== -1) ? num.split('.') : [num];
      numArray[0] = numArray[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
      return numArray.join('.');
    },


    /**
     * コンソールかアラートでエラーメッセージを表示します。
     * @param methodName
     * @param message
     * @param output
     * @param returnValue
     * @returns {*}
     */
    errorMessage: function (methodName, message, output, returnValue) {
      if (!output) {
        output = null;
      }
      var text = 'You have an error in ' + methodName + ': ' + message;
      switch (output) {
        case 'alert':
          alert(text);
          break;
        case 'console':
          if (this.console && typeof console.error != "undefined") {
            console.error(text);
          }
          break;
      }
      if (typeof returnValue === 'boolean') {
        return returnValue;
      }
      return text;
    },


    /**
     * 入れ子のオブジェクトを子オブジェクトの内容を基準にソートします。
     * @param array
     * @param key
     * @param order
     * @param type
     */
    objectSort: function (array, key, order, type) {
      order = (order === 'ascend') ? -1 : 1;
      array.sort(function (obj1, obj2) {
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
    },


    /**
     * ランダムに仮のIDを作成します。
     * @returns {string}
     */
    temporaryId: function (prefix) {
      if (prefix === false) {
        prefix = '';
      }
      else {
        prefix = prefix ? prefix : 'id-';
      }
      return prefix + Math.floor(Math.random() * 10000000000000000).toString(36);
    },


    /**
     * URL 文字列からプロトコルとホスト部を削除します。
     * @param url
     * @returns {void | string | *}
     */
    removeHost: function (url) {
      if (!url) {
        return '';
      }
      let host = '';
      if (typeof mtappVars.removeHostPattern === 'string' && mtappVars.removeHostPattern) {
        host = mtappVars.removeHostPattern;
      }
      else {
        host = 'https?:\/+[^\/]+';
      }
      const pattern = new RegExp('^' + host + '(.*)');
      return url.replace(pattern, '$1');
    },


    /**
     * スクロール位置を取得します。
     * Adapted from getPageSize() by quirksmode.com
     * @returns {any[]}
     */
    getPageScroll: function () {
      let xScroll, yScroll;
      if (self.pageYOffset) {
        yScroll = self.pageYOffset;
        xScroll = self.pageXOffset;
      } else if (document.documentElement && document.documentElement.scrollTop) {
        yScroll = document.documentElement.scrollTop;
        xScroll = document.documentElement.scrollLeft;
      } else if (document.body) {
        yScroll = document.body.scrollTop;
        xScroll = document.body.scrollLeft;
      }
      return new Array(xScroll, yScroll);
    },


    /**
     * ウィンドウの高さを取得します。
     * Adapted from getPageSize() by quirksmode.com
     * @returns {*}
     */
    getPageHeight: function () {
      let windowHeight;
      if (self.innerHeight) {
        windowHeight = self.innerHeight;
      } else if (document.documentElement && document.documentElement.clientHeight) {
        windowHeight = document.documentElement.clientHeight;
      } else if (document.body) {
        windowHeight = document.body.clientHeight;
      }
      return windowHeight;
    },


    /**
     * Cookie に値をセットします。
     * @param key
     * @param val
     * @param days
     */
    setCookie: function (key, val, days) {
      let cookie = encodeURIComponent(key) + '=' + encodeURIComponent(val);
      if (days != null) {
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        cookie += ';expires=' + expires.toUTCString();
      }
      document.cookie = cookie;
    },


    /**
     * Cookie の値を取得します。
     * @param key
     * @returns {string}
     */
    getCookie: function (key) {
      if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].replace(/\s/g,'').split('=');
          if (cookie[0] === encodeURIComponent(key)) {
            return decodeURIComponent(cookie[1]);
          }
        }
      }
      return '';
    },


    /**
     * オブジェクトをディープコピーします。
     * @param obj
     * @returns {any}
     */
    deepCopy: function  (obj) {
      return JSON.parse(Object.toJSON(obj));
    },


    /**
     * オーバーレイ・リッチエディタを適用します。
     */
    overlayEditor: {
      init: function () {
        // HTML 編集モードでキャンセルをクリックしたときは、先にHTML編集モードを終了する
        $('#mtapp-overlay-editor-cancel').on('click', function () {
          const $sourceButton = $('#mtapp-overlay-editor-modal [aria-label="mt_source_mode"][aria-pressed="true"]');
          if ($('#mtapp-overlay-editor:visible').length && $sourceButton.length) {
            $sourceButton.trigger('click');
          }
          return true;
        });
        $('#mtapp-overlay-editor-modal').on({
          'hidden.bs.modal': function () {
            window.tinymce.remove('#mtapp-overlay-editor');
            $('#mtapp-overlay-editor').prependTo('#mtapp-overlay-editor-inner').nextAll().remove();
          },
          'shown.bs.modal': function () {
            $('.modal-backdrop.show:last').css('z-index', 1030);
            // PROD_MTAPPJQUERY-122 オーバーレイ・リッチテキストのリンクやHTML挿入が入力できない
            $(document).off('focusin.bs.modal');
          }
        });
        $('#mtapp-overlay-editor-modal .modal-dialog').css({
          width: window.innerWidth / 3 * 2,
          maxWidth: window.innerWidth / 3 * 2
        });
      },
      open: function (id, html, options) {
        const op = $.extend({}, options);
        html = typeof html === 'undefined' ? '' : html;
        if (typeof id === 'string') {
          document.getElementById('mtapp-overlay-editor').value = html;
          $('#mtapp-overlay-editor-modal').attr('data-target-id', id).modal('show');
          if (typeof window.app.editors === 'undefined') {
            window.app.editors = {};
          }
          window.app.editors['mtapp-overlay-editor'] = new MT.EditorManager('mtapp-overlay-editor', {
            format: 'richtext',
            wrap: true
          });

          // HTMLモードをクリックした時に値を保存する
          $('#mtapp-overlay-editor-modal [aria-label="mt_source_mode"]').on('click', function () {
            window.app.editors['mtapp-overlay-editor'].currentEditor.save();
          });
        }
      },
      save: function () {
        const $sourceModeButton = $('#mtapp-overlay-editor-modal [aria-label="mt_source_mode"]');
        if ($sourceModeButton.is('[aria-pressed="true"]')) {
          $sourceModeButton.trigger('click');
        }
        window.app.editors['mtapp-overlay-editor'].currentEditor.save();
        const editor = document.getElementById('mtapp-overlay-editor');
        const html = editor.value;
        const id = $('#mtapp-overlay-editor-modal').modal('hide').attr('data-target-id');
        const target = document.getElementById(id);
        target.value = html;
        target.dispatchEvent(mtappVars.eventInput);
        document.getElementById(id + '-view').innerHTML = html;
      }
    },


    /**
     * アセットのアップロード機能を提供します。
     */
    assetField: {
      cleanup: function () {
        mtappVars.assetField = {
          fieldId: '',
          assetId: '',
          assetList: {},
          assetType: 'image'
        };
      },
      init: function () {
        const self = this;
        self.cleanup();
        $('#mtapp-asset-field').mtModal();
        $('.mt-modal').on('hidden.bs.modal.assetField', function () {
          if (mtappVars.assetField.assetId !== '') {
            const target = document.getElementById(mtappVars.assetField.fieldId);
            target.value = mtappVars.assetField.assetId;
            target.dispatchEvent(mtappVars.eventInput);
            const targetThumbnail = document.getElementById(mtappVars.assetField.fieldId + '-thumb');
            const targetUrl = document.getElementById(mtappVars.assetField.fieldId + '-url');
            // すでにアップロードされているアセットから選択された場合
            if (typeof window.top.mtappVars.assetField.assetList['asset-' + mtappVars.assetField.assetId + '-json'] === 'string') {
              const assetDetails = JSON.parse(window.top.mtappVars.assetField.assetList['asset-' + mtappVars.assetField.assetId + '-json']);
              targetUrl.value = mtapp.removeHost(assetDetails.url);
              targetUrl.dispatchEvent(mtappVars.eventInput);
              if (mtappVars.assetField.assetType === 'image') {
                targetThumbnail.value = mtapp.removeHost(assetDetails.preview_url);
                targetThumbnail.dispatchEvent(mtappVars.eventInput);
              }
            }
            else {
              $.ajax({
                url: [mtappVars.dataapi_script_url, 'v' + mtappVars.dataapi_default_version, 'sites', mtappVars.blog_id, 'assets', mtappVars.assetField.assetId].join('/'),
                dataType: 'json'
              }).done(function (response) {
                targetUrl.value = mtapp.removeHost(response.url);
                targetUrl.dispatchEvent(mtappVars.eventInput);
              });
              // 画像の場合のサムネイルの処理
              if (mtappVars.assetField.assetType === 'image') {
                $.ajax({
                  url: [mtappVars.dataapi_script_url, 'v' + mtappVars.dataapi_default_version, 'sites', mtappVars.blog_id, 'assets', mtappVars.assetField.assetId, 'thumbnail'].join('/'),
                  data: {
                    width: 120,
                    height: 120
                  },
                  dataType: 'json'
                }).done(function (response) {
                  targetThumbnail.value = mtapp.removeHost(response.url);
                  targetThumbnail.dispatchEvent(mtappVars.eventInput);
                });
              }
            }
          }
          self.cleanup();
        });
      },
      select: function (id, type) {
        if (typeof type !== 'string') {
          type = 'image';
        }
        mtappVars.assetField.fieldId = id;
        mtappVars.assetField.assetType = type;
        const $trigger = $('#mtapp-asset-field');
        const url = $trigger.attr('href').replace(/(filter_val|require_type)=(\w+)/g, '$1=' + type);
        $trigger.attr('href', url).trigger('click');
        return false;
      },
      remove: function (id) {
        const idField = document.getElementById(id);
        const thumbField = document.getElementById(id + '-thumb');
        const urlField = document.getElementById(id + '-url');
        if (idField) {
          idField.value = '';
          idField.dispatchEvent(mtappVars.eventInput);
        }
        if (thumbField) {
          thumbField.value = '';
          thumbField.dispatchEvent(mtappVars.eventInput);
        }
        if (urlField) {
          urlField.value = '';
          urlField.dispatchEvent(mtappVars.eventInput);
        }
      },
      publicUrl: function (path) {
        if (!path) {
          return '';
        }
        else if (/^http/.test(path)) {
          return path;
        }
        else {
          return mtappVars.site.site_url.replace(/(https?:\/\/[^\/]+).*/, '$1') + path;
        }
      }
    },


    /**
     * .templateListCustomize(options)
     *
     * テンプレートの管理画面（一覧画面）を見やすくします。
     *
     * Updated: 2018/06/06
     *
     * @param options
     * @param options.templateNameSets {array}
     * @param options.displayType {string}: 'listIndent' or 'group'
     * @param options.labelWeight {string} 'bold' or 'normal'
     * @param options.moveTop {boolean} Only when you set 'group' to 'displayType' option.
     * @param options.labelType {string} 'block' or 'inline' only when you set 'group' to 'displayType' option.
     */
    templateListCustomize: function (options) {

      const op = $.extend({
        templateNameSets: [],
        displayType: 'listIndent',
        labelWeight: 'bold',
        moveTop: false,
        labelType: 'block'
      }, options);

      if (mtappVars.screen_id !== 'list-template') {
        return;
      }

      if (op.displayType === 'listIndent') {
        $('table.listing tbody').each(function () {
          const $tdList = $(this).find('td.template-name');
          for (let i = 0, l = op.templateNameSets.length; i < l; i++) {
            let $firstTr;
            let $tr;
            $tdList.find('a').filter(function (idx, elm) {
              if (op.templateNameSets[i]['keyword'] instanceof RegExp) {
                return op.templateNameSets[i]['keyword'].test(elm.innerHTML);
              }
              else {
                return elm.innerHTML.indexOf(op.templateNameSets[i]['keyword']) !== -1;
              }
            }).each(function (idx) {
              const _replacement = op.templateNameSets[i]['replacement'] ? op.templateNameSets[i]['replacement']: '';
              this.innerHTML = this.innerHTML.replace(op.templateNameSets[i]['keyword'], _replacement);
              this.style.position = 'relative';
              this.style.left = '2em';
              if (idx === 0) {
                $firstTr = $(this).parents('tr');
                const tdCount = $firstTr.find('td').length;
                let paddingLeft = 8;
                $(this).parent().prevAll().each(function () {
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
        $('table.listing tbody').each(function () {
          const $tdList = $(this).find('td.template-name');
          let $firstTd;
          let $parentTbody;
          for (let i = 0, l = op.templateNameSets.length; i < l; i++) {
            $tdList.find('a').filter(function (idx, elm) {
              if (op.templateNameSets[i]['keyword'] instanceof RegExp) {
                return op.templateNameSets[i]['keyword'].test(elm.innerHTML);
              }
              else {
                return elm.innerHTML.indexOf(op.templateNameSets[i]['keyword']) !== -1;
              }
            }).each(function (idx) {
              const _replacement = op.templateNameSets[i]['replacement'] ? op.templateNameSets[i]['replacement']: '';
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
      $('tbody tr:visible').each(function (idx) {
        if (idx % 2 == 1) {
          $(this).removeClass('odd even').addClass('odd');
        }
        else {
          $(this).removeClass('odd even').addClass('even');
        }
      });
    },


    /**
     * getCategoryName(options)
     *
     * 記事の編集画面ではカテゴリ名を、ウェブページの編集画面ではフォルダ名を取得できます。
     *
     * @param options
     * @param options.id {Number} 調べたいカテゴリidを渡します。
     * @param options.field {String} 'label' or 'basename'
     * @returns {*} カテゴリ名またカテゴリの出力ファイル名を返します。
     */
    getCategoryName: function (options) {

      if (!$.isArray(MT.App.categoryList)) {
        return;
      }

      const op = $.extend({
        id: -1,
        field: 'label'
      }, options);

      if (op.id === -1 || /^\d+$/.test(op.id) === false) {
        return;
      }

      for (let i = 0, l = MT.App.categoryList.length; i < l; i++) {
        if (MT.App.categoryList[i].id == op.id) {
          return MT.App.categoryList[i][op.field];
        }
      }
    },


    /**
     * データ識別ラベルを右サイドバーに移動します。
     */
    dataLabelCustomize: function (options) {

      const base = this;

      const op = $.extend({
        insertBefore: '#basename-field',
        linkedField: null
      }, options);

      const $dataLabel = $('#data_label');

      if (op.insertBefore) {
        $('#data_label-field').insertBefore(op.insertBefore);
      }

      if (op.linkedField !== null) {
        $(op.linkedField).on('change', function () {
          $dataLabel.val($(op.linkedField).val());
        });
      }
      $dataLabel.mtapp('enableEdit');

    },

    /**
     * サイドバーの開閉ボタンを追加
     */
    sidebarCollapse: function () {
      const $body = $('body');
      if ($body.hasClass('preview-screen')) {
        return;
      }
      $body.append('<button id="mtapp-sidebar-collapse" type="button"><svg title="Full School" role="img" class="mt-icon"><use xlink:href="' + mtappVars.static_path + 'images/sprite.svg#ic_fullscreen" /></svg></button>');
      $('#mtapp-sidebar-collapse').on('click', function () {
        $('.mt-secondaryPanel,.mt-primaryNavigation,.mt-secondaryPanel--scrollable').toggleClass('d-none');
      });
    },

    /**
     * 画面上部にMTデフォルトの形式のメッセージを表示します。
     *
     * Updated: 2018/06/26
     *
     * @param {Object} options
     * @param {String} options.msg 表示するメッセージ
     * @param {String} options.type 'success', 'info', 'warning' or 'danger'
     * @param {Boolean} options.dismissible trueをセットすると閉じるボタンを表示します。
     * @param {Boolean} options.noInsert trueをセットするとページに表示せずにHTMLだけを返します。
     */
    msg: function (options) {

      const op = $.extend({
        msg: '',
        type: 'info',
        dismissible: false,
        noInsert: false
      }, options);

      const msgHtml = op.dismissible ?
        '<div class="alert alert-' + op.type + ' alert-dismissible fade show" role="alert">' +
        '<button type="button" class="close" data-dismiss="alert" aria-label="閉じる"><span aria-hidden="true">&times;</span></button>' + op.msg +
        '</div>' :
        '<div class="alert alert-' + op.type + '">' + op.msg + '</div>';

      if (op.noInsert) {
        return msgHtml;
      }

      const $msgBlock = $('#msg-block');
      if ($msgBlock.length) {
        $msgBlock.append(msgHtml);
      }
      else {
        $('#page-title').after(msgHtml);
      }
    },

    /***
     * MT標準のウィジェットのHTMLを作成します。
     *
     * Updated: 2018/06/26
     *
     * @param {Object} options
     * @param {String} options.basename
     * @param {String} options.label ラベル部分のテキスト、HTML
     * @param {String} options.content コンテンツ部分のテキスト、HTML
     * @param {String} options.action アクション部分のテキスト、HTML
     * @param {String} options.footer フッター部分のテキスト、HTML
     * @returns {string}
     */
    makeWidget: function (options) {

      const op = $.extend({
        basename: '',
        label: '',
        content: '',
        action: '',
        footer: ''
      }, options);

      const id = op.basename !== '' ? op.basename : mtapp.temporaryId();
      const titleClass = op.action ? 'mt-widget__sitelist' : '';

      return [
        '<div id="' + id + '-field" class="mt-widget">',
          '<h2 class="mt-widget__title"><span class="' + titleClass + '">' + op.label + '</span>' + op.action + '</h2>',
          '<div class="mt-widget__content">' + op.content + op.footer + '</div>',
        '</div>'
      ].join('');
    },

    /***
     * MT標準のフィールドのHTMLを作成します。
     *
     * Updated: 2018/06/26
     *
     * @param {Object} options
     * @param {String} options.basename フィールドのID。自動で -field が付与されます。
     * @param {String} options.label ラベル部分のテキスト、HTML
     * @param {String} options.content コンテンツ部分のテキスト、HTML
     * @param {String} options.hint コンテンツのヒント部分のテキスト、HTML
     * @returns {string}
     */
    makeField: function (options) {

      const op = $.extend({
        basename: '',
        label: '',
        content: '',
        hint: ''
      }, options);

      const basename = op.basename !== '' ? op.basename : mtapp.temporaryId();
      const hint = op.hint ? '<small class="form-text text-muted">' + op.hint + '</small>' : '';
      const required = op.required ? '<span class="badge badge-danger">必須</span>' : '';

      return [
        '<div id="' + basename + '-field" class="form-group">',
          '<label class="first-child">' + op.label + required + '</label>',
          op.content + hint,
        '</div>'
      ].join('');
    },

    /**
     * Data API を利用してコンテンツデータ、記事を複製します。一覧画面での複製にも対応しています。
     *
     * Updated: 2020/02/18
     *
     * @param {Object} options
     * @param {String} options.additionalText 複製元のタイトルにつけるテキストを設定します（初期値：'のコピー'）。
     * @param {Number} options.contentDataTitleFieldId コンテンツデータの場合はタイトルとなるフィールドの ID をセットします。データ識別子をそのまま利用している場合は設定不要です。
     * @param {Function} options.cbModifyContent 複製元のコンテンツを複製する前に編集する関数を設定します。この関数の引数には複製するコンテンツのオブジェクトが渡されます。編集後のオブジェクトを return します。
     */
    duplicateContent: function (options) {

      const op = $.extend({
        additionalText: 'のコピー',
        contentDataTitleFieldId: 0,
        cbModifyContent: null
      }, options);

      // すでに duplicateContent が適用されている場合は何もしない
      if (typeof mtappVars._hasDuplicateContent === 'undefined') {
        mtappVars._hasDuplicateContent = true;
      }
      else {
        return;
      }

      // 複製ボタンを作成、挿入、取得
      const duplicateButton = '<button type="button" id="mtapp-duplicate-button" class="btn btn-warning text-white">複製</button>';
      // コンテンツデータ編集の場合
      if (['edit-content-type-data', 'edit-entry'].indexOf(mtappVars.screen_id) !== -1) {
        $('#entry-publishing-widget').find('.btn-primary:last').parent().append(duplicateButton);
      }
      else if (['list-content_data', 'list-entry'].indexOf(mtappVars.screen_id) !== -1) {
        $(window).on('listReady.mtapp.duplicate', function() {
          $('#actions-bar-top [data-action-id="delete"]').after(duplicateButton);
          $(window).off('listReady.mtapp.duplicate');
        });
      }

      // DOM を取得
      const $body = $('body');
      const $duplicateModal = $('#mtapp-modal-duplicate');
      const $duplicateModalNewTitle = $('#mtapp-modal-duplicate-new-title');
      const $duplicateModalSubmit = $('#mtapp-modal-duplicate-submit');

      // 複製を実行
      $body.on('mtapp.duplicate', function (event, collection, confirm) {

        if (!$.isArray(collection) || collection.length === 0) {
          return alert('Invalid arguments');
        }

        const doDuplicate = function () {

          let updatedCount = 0;

          mtapp.loadingImage('show');

          // コンテンツデータの場合
          if (['edit-content-type-data', 'list-content_data'].indexOf(mtappVars.screen_id) !== -1) {

            collection.forEach(function (cd) {

              const newCd = Object.toJSON(cd);
              mtappVars.DataAPI.createContentData(mtappVars.blog_id, mtappVars.content_type_id, newCd, function (response) {

                // エラーの場合
                if (response.error) {
                  mtapp.loadingImage('hide');
                  mtapp.modalMsg({
                    type: 'error',
                    title: 'エラー',
                    content: response.error.message
                  });
                  return;
                }

                // 成功した場合
                if (response.id) {
                  updatedCount++;
                  // すべて終了した場合
                  if (updatedCount === collection.length) {
                    if (updatedCount === 1) {
                      location.href = mtappVars.adminScript + '?__mode=view&content_type_id=' + mtappVars.content_type_id + '&_type=content_data&id=' + response.id + '&type=content_data_' + mtappVars.content_type_id + '&blog_id=' + mtappVars.blog_id;
                    }
                    else {
                      location.href = mtappVars.adminScript + '?__mode=list&_type=content_data&type=content_data_' + mtappVars.content_type_id + '&blog_id=' + mtappVars.blog_id;
                    }
                  }
                }

              });
            });
          }
          // 記事の場合
          else if (['edit-entry', 'list-entry'].indexOf(mtappVars.screen_id) !== -1) {

            collection.forEach(function (entry) {

              const newEntry = Object.toJSON(entry);
              mtappVars.DataAPI.createEntry(mtappVars.blog_id, newEntry, function (response) {

                // エラーの場合
                if (response.error) {
                  mtapp.loadingImage('hide');
                  mtapp.modalMsg({
                    type: 'error',
                    title: 'エラー',
                    content: response.error.message
                  });
                  return;
                }

                // 成功した場合
                if (response.id) {
                  updatedCount++;
                  // すべて終了した場合
                  if (updatedCount === collection.length) {
                    if (updatedCount === 1) {
                      location.href = mtappVars.adminScript + '?__mode=view&_type=entry&blog_id=' + mtappVars.blog_id + '&id=' + response.id;
                    }
                    else {
                      location.href = mtappVars.adminScript + '?__mode=list&_type=entry&blog_id=' + mtappVars.blog_id;
                    }
                  }
                }

              });
            });
          }
        };

        if (confirm) {
          mtapp.modalConfirm({
            content: '複製しますか？',
            callback: function () {
              doDuplicate();
            }
          });

        }
        else {
          doDuplicate();
        }

      });
      // END 複製を実行

      // ウィジェットやアクションバーの複製ボタンをクリックしたときの処理
      $body.on('click.duplicateContent', '#mtapp-duplicate-button', function () {

        let ids = [];

        // 編集画面で実行された場合
        if (['edit-content-type-data', 'edit-entry'].indexOf(mtappVars.screen_id) !== -1) {
          if (!mtappVars.id) {
            mtapp.modalMsg({
              type: 'error',
              title: 'エラー',
              content: '複製するコンテンツが保存されていません。'
            });
            return;
          }
          ids.push(mtappVars.id);
        }
        // 一覧画面で実行された場合
        else if (['list-content_data', 'list-entry'].indexOf(mtappVars.screen_id) !== -1) {
          $('[data-is="list-table"] [name="id"]:checked').each(function () {
            ids.push($(this).val());
          });
          if (ids.length === 0) {
            mtapp.modalMsg({
              type: 'error',
              title: 'エラー',
              content: '複製するコンテンツが選択されていません。'
            });
            return;
          }
        }

        // コンテンツデータの場合
        if (['edit-content-type-data', 'list-content_data'].indexOf(mtappVars.screen_id) !== -1) {

          mtapp.loadingImage('show');

          // コンテンツデータを取得
          mtappVars.DataAPI.listContentData(mtappVars.blog_id, mtappVars.content_type_id, { limit: 1000, includeIds: ids.join(',') }, function (response) {

            mtapp.loadingImage('hide');

            // エラーの場合
            if (response.error) {
              mtapp.modalMsg({
                type: 'error',
                title: 'エラー',
                content: response.error.message
              });
              return;
            }

            // items が空の場合
            if (response.items.length === 0) {
              mtapp.modalMsg({
                type: 'error',
                title: 'エラー',
                content: '複製元のデータが見つかりません。'
              });
              return;
            }

            mtapp.loadingImage('hide');

            // 取得したすべてのコンテンツデータを調整
            let currentTitle = '';
            let updateContentData = response.items.map(function(cd) {
              // 共通の処理
              delete cd.id;
              cd.status = 'Draft';
              // タイトルを調整
              if (op.contentDataTitleFieldId) {
                op.contentDataTitleFieldId = Number(op.contentDataTitleFieldId);
                for (let i = 0; i < cd.data.length; i++) {
                  if (Number(cd.data[i].id) === op.contentDataTitleFieldId) {
                    currentTitle = cd.data[i].data + op.additionalText;
                    cd.data[i].data = currentTitle;
                  }
                }
              }
              else {
                currentTitle = cd.label + op.additionalText;
              }
              cd.label = currentTitle;

              // コールバックでの処理
              if (typeof op.cbModifyContent === 'function') {
                cd = op.cbModifyContent(cd)
              }

              return cd;
            });

            // コンテンツデータ編集画面で実行された場合
            if (mtappVars.screen_id === 'edit-content-type-data') {

              // モーダルに複製後のタイトルのセット
              $duplicateModalNewTitle.val(currentTitle);

              // 複製モーダルを表示
              $duplicateModal.modal();

              // モーダルの複製ボタンがクリックされたときの処理
              $duplicateModalSubmit.off('click.mtapp.duplicate').on('click.mtapp.duplicate', function () {
                // 編集したタイトルをセット
                if (op.contentDataTitleFieldId) {
                  op.contentDataTitleFieldId = Number(op.contentDataTitleFieldId);
                  for (let i = 0; i < updateContentData[0].data.length; i++) {
                    if (Number(updateContentData[0].data[i].id) === op.contentDataTitleFieldId) {
                      updateContentData[0].data[i].data = $duplicateModalNewTitle.val();
                    }
                  }
                }
                updateContentData[0].label = $duplicateModalNewTitle.val();

                $duplicateModal.modal('hide');
                $body.trigger('mtapp.duplicate', [updateContentData, false]);
              })

            }
            // コンテンツデータ一覧画面で実行された場合
            else if (mtappVars.screen_id === 'list-content_data') {
              $body.trigger('mtapp.duplicate', [updateContentData, true]);
            }
          });

        }
        // 記事の場合
        else if (['edit-entry', 'list-entry'].indexOf(mtappVars.screen_id) !== -1) {

          mtapp.loadingImage('show');

          // 記事を取得
          mtappVars.DataAPI.listEntries(mtappVars.blog_id, mtappVars.content_type_id, { limit: 1000, includeIds: ids.join(',') }, function (response) {

            mtapp.loadingImage('hide');

            // エラーの場合
            if (response.error) {
              mtapp.modalMsg({
                type: 'error',
                title: 'エラー',
                content: response.error.message
              });
              return;
            }

            // items が空の場合
            if (response.items.length === 0) {
              mtapp.modalMsg({
                type: 'error',
                title: 'エラー',
                content: '複製元のデータが見つかりません。'
              });
              return;
            }

            // 取得したすべての記事を調整
            let currentTitle = '';

            let updateContentData = response.items.map(function(entry) {
              // 共通の処理
              delete entry.id;
              entry.status = 'Draft';
              // タイトルを調整
              currentTitle = entry.title + op.additionalText;
              entry.title = currentTitle;

              // コールバックでの処理
              if (typeof op.cbModifyContent === 'function') {
                entry = op.cbModifyContent(entry)
              }

              return entry;
            });

            // 記事編集画面で実行された場合
            if (mtappVars.screen_id === 'edit-entry') {

              // モーダルに複製後のタイトルのセット
              $duplicateModalNewTitle.val(currentTitle);

              // 複製モーダルを表示
              $duplicateModal.modal();

              // モーダルの複製ボタンがクリックされたときの処理
              $duplicateModalSubmit.off('click.mtapp.duplicate').on('click.mtapp.duplicate', function () {
                // 編集したタイトルをセット
                updateContentData[0].title = $duplicateModalNewTitle.val();

                $duplicateModal.modal('hide');
                $body.trigger('mtapp.duplicate', [updateContentData, false]);
              })

            }
            // 記事一覧画面で実行された場合
            else if (mtappVars.screen_id === 'list-entry') {
              $body.trigger('mtapp.duplicate', [updateContentData, true]);
            }
          });

        }
      });

    },

    /**
     * 記事やウェブページ、コンテンツデータを複製します。
     *
     * Updated: 2020/02/14
     *
     * @param {Object} options
     * @param {Boolean} options.changeBlog 複製するオブジェクトが記事の場合は `true` をセットするとブログの変更を可能にします。
     * @param {String} options.contentDataTitleFieldName 複製するオブジェクトがコンテンツデータの場合は「〜のコピー」を付与したいフィールドの name 属性値をセットします。
     */
    duplicate: function (options) {

      const op = $.extend({
        changeBlog: false,
        contentDataTitleFieldName: 'data_label'
      }, options);

      // すでに duplicateContent が適用されている場合は何もしない
      if (typeof mtappVars._hasDuplicateContent === 'undefined') {
        mtappVars._hasDuplicateContent = true;
      }
      else {
        return;
      }

      // 記事以外は changeBlog オプションを無効化
      if (mtappVars.type !== 'entry') {
        op.changeBlog = false;
      }

      // 複製ボタンを作成
      const duplicateButton = '<button type="button" id="mtapp-duplicate-button" class="btn btn-warning">複製</button>';

      // ブログの変更が有効の場合のドロップダウンリストと複製ボタンを追加
      if (op.changeBlog) {
        let changeBlogs = [];
        if (op.changeBlog && mtappVars.me.permission.can_create_post_blogs && mtappVars.permitted_sites) {
          for (let i = 0; i < mtappVars.permitted_sites.length; i++) {
            const id =  mtappVars.permitted_sites[i].id - 0;
            const name = mtappVars.permitted_sites[i].name;
            const selected = (id == mtappVars.blog_id) ? ' selected="selected"': '';
            if ($.inArray(id, mtappVars.me.permission.can_create_post_blogs) !== -1) {
              changeBlogs.push('<option' + selected + ' value="' + id + '">' + name + '</option>');
            }
          }
        }
        $('#entry-publishing-widget').after(mtapp.makeWidget({
          label: 'ブログの変更',
          content: '' +
            '<select class="form-control" id="mtapp-duplicate-blog-id">' + changeBlogs.join('') + '</select>' +
            '<p>' + duplicateButton + '</p>'
        }));
      }
      // ブログの変更が無効の場合に複製ボタンのみを追加
      else {
        $('#entry-publishing-widget').find('.btn-primary:last').parent().append(duplicateButton);
      }

      // 複製ボタンを取得
      const $duplicateButton = $('#mtapp-duplicate-button');

      // メインの form を取得
      const $form = $duplicateButton.closest('form');

      // タイトルフィールドを取得
      let $orgTitleField = null;
      if (mtappVars.screen_id === 'edit-content-type-data') {
        $orgTitleField = $('[name="' + op.contentDataTitleFieldName + '"]');
      }
      else {
        $orgTitleField = $('[name="title"]');
      }

      // 新しいタイトル設定フィールドを取得
      const $newTitleField = $('#mtapp-modal-duplicate-new-title');

      // モーダル内の複製ボタンがクリックされた時の処理
      $('#mtapp-modal-duplicate-submit').on('click', function () {
        if (confirm('複製しますか？')) {
          $orgTitleField.val($newTitleField.val());
          $form.trigger('submit');
        }
      });

      $duplicateButton.on('click', function () {
        $form.find('[name]').each(function () {
          const name = $(this).attr('name');
          switch (name) {
            case 'id': {
              $(this).after('<input type="hidden" name="author_id" value="' + mtappVars.author_id + '" />').remove();
              break;
            }
            case 'blog_id': {
              const blog_id = (op.changeBlog) ? $('#mtapp-duplicate-blog-id').val(): $(this).val();
              $(this).val(blog_id);
              break;
            }
            case 'return_args': {
              $(this).val(this.value.replace(/&amp;id=[0-9]+|&id=[0-9]+/,''));
              break;
            }
            case 'status': {
              $(this).val(1);
              break;
            }
          }
        });
        // モーダルを取得してモーダルが開いた時の処理を追加してから開く
        $('#mtapp-modal-duplicate').off('shown.bs.modal').on('shown.bs.modal', function () {
          $newTitleField.val($orgTitleField.val() + 'のコピー');
        }).modal();
      });
    },


    /**
     * confirm 関数のような処理をダイアログメッセージで実装できます。
     *
     * Updated: 2020/02/18
     *
     * @param {Object} options
     * @param {String} options.type success、info、warning、error の４タイプを指定可能
     * @param {String} options.title モーダルウィンドウのタイトル
     * @param {String} options.content モーダルウィンドウのコンテンツ（HTML）
     * @param {Array} options.callback OKボタンがクリックされたときに実行される関数
     */
    modalConfirm: function (options) {

      const op = $.extend({
        type: '',
        title: '確認',
        content: 'よろしいですか？',
        callback: function () {
          alert('OKボタンがクリックされました！');
        }
      }, options);

      if (op.type) {
        op.title = '<svg role="img" class="mt-icon--' + op.type + ' mt-icon--sm">' + mtappIcons[op.type] + '</svg> ' + op.title;
      }

      document.getElementById('mtapp-modal-confirm-title').innerHTML = op.title;
      document.getElementById('mtapp-modal-confirm-content').innerHTML = op.content;
      $('#mtapp-modal-confirm-dialog').addClass('modal-' + op.size);

      const $modalConfirm = $('#mtapp-modal-confirm').attr('data-mtapp-type', op.type);

      $modalConfirm.on('show.bs.modal', function () {
        $('#mtapp-modal-confirm-submit').off('click.mtapp.confirm').on('click.mtapp.confirm', function () {
          $modalConfirm.modal('hide');
          op.callback();
        });
      });

      $modalConfirm.modal();
    },

    /**
     * ダイアログメッセージを表示します。
     *
     * Updated: 2020/02/18
     *
     * @param {Object} options
     * @param {String} options.type success、info、warning、error の４タイプを指定
     * @param {String} options.title モーダルウィンドウのタイトル
     * @param {String} options.content モーダルウィンドウのコンテンツ（HTML）
     * @param {String} options.size モーダルウィンドウのサイズ。`sm` or `lg`
     * @param {Array} options.callbacks モーダルに適用するコールバックの配列
     *
     * e.g.
     * ```
     * mtapp.modalMsg({
     *   type: 'info',
     *   title: 'Hi mate!',
     *   content: '<p class="mb-0"><strong>How are you today?</strong></p>',
     *   callbacks: [{
     *     type: 'shown.bs.modal',
     *     action: function () {
     *       alert('shown.bs.modal');
     *     }
     *   }, {
     *     type: 'hide.bs.modal',
     *     action: function () {
     *       alert('hide.bs.modal');
     *     }
     *   }]
     * });
     * ```
     */
    modalMsg: function (options) {

      const op = $.extend({
        type: '',
        title: 'Thank you',
        content: 'MTAppjQueryをご利用いただきありがとうございます！',
        size: '',
        callbacks: []
      }, options);

      if (op.type) {
        op.title = '<svg role="img" class="mt-icon--' + op.type + ' mt-icon--sm">' + mtappIcons[op.type] + '</svg> ' + op.title;
      }

      document.getElementById('mtapp-modal-message-title').innerHTML = op.title;
      document.getElementById('mtapp-modal-message-content').innerHTML = op.content;
      $('#mtapp-modal-message-dialog').addClass('modal-' + op.size);

      const $modal = $('#mtapp-modal-message').attr('data-mtapp-type', op.type);

      if (op.callbacks.length > 0) {
        for (let i = 0; i < op.callbacks.length; i++) {
          let eventType = op.callbacks[i].type;
          let action = op.callbacks[i].action;
          $modal.off(eventType).on(eventType, action);
        }
      }

      $modal.modal();
    },

    /**
     * ページの情報や各種一覧でIDを表示
     *
     * Updated: 2018/06/27
     *
     * @param {Object} options
     * @param {Boolean} options.id `true` をセットするとIDをテーブルに表示します。
     */
    debug: function (options) {

      const op = $.extend({
        id: false
      }, options);

      // Show the page information
      const $body = $('body');
      let bodyID = $body.attr('id') || '';
      let bodyClass = $body.attr('class').replace(/ +/g,'.');
      if (bodyID) {
        bodyID = '#' + bodyID.trim();
      }
      if (bodyClass) {
        bodyClass = '.' + bodyClass.trim();
      }

      const pageInfo = [
        '<pre id="mtapp-show-basename"></pre>',
        '<pre id="mtapp-debug-pageinfo-content" class="msg-text">body' + bodyID + bodyClass + '</pre>'
      ];

      mtapp.msg({
        msg: pageInfo.join("\n"),
        type: 'info',
        dismissible: true
      });

      console.warn('mtappVars', mtappVars);

      const fieldSort = [];
      const $mainContent = $('.mt-mainContent');

      if ($mainContent.length) {
        $mainContent.find('div.field:visible').each(function () {
          const basename = $(this).attr('id').replace(/-field$/, '');
          fieldSort.push(basename);
          $(this).before('<input type="text" value="' + basename + '" class="form-control" />');
        });

        $('#msg-block').after(mtapp.makeField({
          label: '現在の並び順',
          content: '<textarea id="mtapp-fieldsort" class="form-control">' + fieldSort.join(',') + '</textarea>'
        }));
      }
      else {
        $('#mtapp-show-basename').hide();
      }

      // [ブログ記事の管理]
      if (mtappVars.screen_id == 'list-entry') {
        //  下書きの背景を変更
        $(window).bind('listReady', function () {
          $('#entry-table').find('span.draft').closest('tr').css({'background':'#FFCBD0'});
        });
      }

      // [カテゴリの管理] [フォルダの管理]
      if (mtappVars.template_filename == 'list_category') {
        // IDを表示
        $(window).bind('listReady', function () {
          $('#root').find('div').each(function () {
            var id = $(this).attr('id');
            $(this).mtapp('showHint', {text: 'ID: ' + id});
          });
        });
      }

      // [テンプレートの管理] [ウィジェットの管理]
      if (op.id && mtappVars.template_filename == 'list_template' || mtappVars.template_filename == 'list_widget') {
        $('table.listing-table')
        .find('th.cb').each(function () {
          $(this).insertListingColum('after', 'th', 'ID', 'id num');
        }).end()
        .find('td.cb').each(function () {
          var id = $(this).find('input:checkbox').val();
          $(this).insertListingColum('after', 'td', id, 'id num');
        });
      }

      // list_common.tmplのリスト画面で表示オプションにIDがないページ
      if (op.id && mtappVars.template_filename == 'list_common' && !$('#disp_cols label:contains("ID")').length) {
        // IDを表示
        $(window).bind('listReady', function () {
          $('table.listing-table').find('tr').each(function () {
            const id = $(this).attr('id');
            $(this)
            .find('th.cb').insertListingColum('after', 'th', 'ID', 'id num').end()
            .find('td.cb').insertListingColum('after', 'td', id, 'id num');
          });
        });
      }
    },

    /**
     * フィールドを並べ替えます。カスタムフィールドは対応、ウィジェットは未対応。
     *
     * Updated: 2018/06/28
     *
     * @param {Object} options
     * @param {String} options.sort 上からの並び順通りに `basename` をカンマ区切りで並べます。
     * @param {String} options.insertID フィールドを包含する要素のid属性の値
     * @param {Boolean} options.otherFieldHide trueにすると並び順を指定したフィールド以外のフィールドを非表示する。
     * @param {Boolean} options.debug trueにすると並び順に指定したフィールドがない場合はコンソールに通知する。
     * @returns {*}
     */
    fieldSort: function (options) {

      const op = $.extend({
        sort: 'title,text,tags,excerpt,keywords',
        insertID: 'sortable',
        otherFieldHide: false,
        debug: false
      }, options);

      const field = op.sort.split(',').reverse();
      const l = field.length;
      if (l == 0) {
        return;
      }
      const $container = document.getElementById(op.insertID);
      if (!$container) {
        return
      }
      if (op.otherFieldHide) {
        $($container).find('div.field').addClass('d-none');
        $('#quickpost').addClass('d-none');
      }
      for (let i = 0; i < l; i++) {
        let id = $.trim(field[i]).replace(/^c:/,'customfield_') + '-field';
        if (document.getElementById(id)) {
          let elm = document.getElementById(id);
          $container.insertBefore(elm, $container.firstChild);
          $(elm).removeClass('d-none').show();
        }
        if (op.debug && window.console) {
          console.warn('#' + id + ' が見つかりません');
        }
      }
    },

    /**
     * 指定したフィールドを1つの新しいサイドバーウィジェットにまとめて入れるか、既存のウィジェットに挿入します。
     *
     * Updated: 2018/06/28
     *
     * @param {Object} options
     * @param {Boolean} options.makeWidget Set to true if you want to make a new widget.
     * @param {String} options.widgetBasename Set a string. This is widget basename.
     * @param {String} options.widgetLabel Set a string/HTML. This is a widget name.
     * @param {String} options.widgetContentTop Set a string/HTML. This is a widget content which is inserted to the top position.
     * @param {String} options.widgetContentBottom Set a string/HTML. This is a widget content which is inserted to the bottom position.
     * @param {String} options.widgetAction Set a string/HTML. This is a widget action content.
     * @param {String} options.widgetFooter Set a string/HTML. This is a widget footer content.
     * @param {String} options.basename Set a separated comma text of moving field's basename
     * @param {String} options.selector Set a separated comma text of moving field's ID
     * @param {String} options.pointerSelector Set the selecter which is the destination moving fields.
     * @param {String} options.method Set a method name, one of 'after', 'before', 'append' and 'prepend'
     * @returns {*}
     */
    moveToWidget: function (options) {

      const op = $.extend({
        makeWidget: true,
        widgetBasename: '',
        widgetLabel: 'New Widget',
        widgetContentTop: '',
        widgetContentBottom: '',
        widgetAction: '',
        widgetFooter: '',
        basename: '',
        selector: '',
        pointerSelector: '',
        method: 'after'
      }, options);

      if (op.pointerSelector === '') {
        return mtapp.errorMessage('MTAppMoveToWidget', 'pointerSelector is required', 'alert', false);
      }

      const selectors = (op.selector !== '') ? op.selector.split(',') : [];
      if (op.basename !== '' && typeof op.basename === 'string') {
        const basenames = op.basename.split(',');
        for (let i = 0, l = basenames.length; i < l; i++) {
          selectors.push('#' + basenames[i].replace(/^c:/, 'customfield_') + '-field');
        }
      }

      // Set HTML to insert
      const widgetInnerId = mtapp.temporaryId();
      let insertHtml = '';
      if (op.makeWidget) {
        // Make a new widget
        insertHtml = mtapp.makeWidget({
          basename: op.widgetBasename,
          label: op.widgetLabel,
          content: op.widgetContentTop + '<div id="' + widgetInnerId + '"></div>' + op.widgetContentBottom,
          action: op.widgetAction,
          footer: op.widgetFooter
        });
      }
      else {
        insertHtml = '<div id="' + widgetInnerId + '"></div>';
      }

      // Set a new widget for fields to move.
      switch (op.method) {
        case 'before':
          $(op.pointerSelector).before(insertHtml);
          break;
        case 'append':
          $(op.pointerSelector).append(insertHtml);
          break;
        case 'prepend':
          $(op.pointerSelector).prepend(insertHtml);
          break;
        default:
          $(op.pointerSelector).after(insertHtml);
      }

      // Move
      for (let i = 0, l = selectors.length; i < l; i++) {
        $(selectors[i]).each(function(){
          $(this).removeClass('hidden').removeClass('sort-enabled d-none').show();
          $(this).appendTo('#' + widgetInnerId);
        });
      }

    },

    /**
     * 保存ボタンの有効・無効をコントロールします。
     *
     * Updated: 2020/07/14
     *
     * @param {String} type `init` （初期化） `hasError` （エラーありで送信不可） `submittable` （送信可）
     * @param {Boolean} withIcon
     */
    submitButtonControl: function (type, withIcon = true) {
      switch (type) {
        case 'init':
          if (typeof mtappVars._system.submitButtons === 'undefined') {
            mtappVars._system.submitButtons = $('[type="submit"].btn-primary');
          }
          break;
        case 'hasError':
          if (mtappVars._system.submitButtons) {
            mtappVars._system.submitButtons.prop('disabled', true);
            mtappVars._system.submitButtons.each(function () {
              if (!$(this).hasClass('mtapp-has-error') && withIcon) {
                $(this).addClass('mtapp-has-error').append('<svg title="Stop" role="img" class="mt-icon--inverse mt-icon--sm ml-2"><use xlink:href="' + mtappVars.static_path + 'images/sprite.svg#ic_error"></use></svg>')
              }
            });
          }
          break;
        case 'submittable':
          if (mtappVars._system.submitButtons) {
            mtappVars._system.submitButtons.prop('disabled', false);
            mtappVars._system.submitButtons.find('svg').remove();
            mtappVars._system.submitButtons.each(function () {
              $(this).removeClass('mtapp-has-error').find('svg').remove();
            });
          }
          break;
      }
    },

    /**
     * ブログ記事編集画面のフィールドをタブのUIで表示します。
     *
     * Updated: 2018/06/29
     *
     * @param {Object} options
     * @param {Array} options.content タブに入れるフィールドとラベルを指定したオブジェクトを要素に持つ配列
     * @param {String} options.pointer `#title-field` などのセレクタ
     * @param {String} options.method `before` or `after`
     */
    tabs: function (options) {

      const op = $.extend({
        content: [],
        pointer: '',
        method: 'after'
      }, options);

      const tabCount = op.content.length;

      if (tabCount === 0 || op.pointer === '' || $(op.pointer).length === 0) {
        return;
      }

      const tabHead = [];
      const tabBody = [];

      for (let i = 0; i < tabCount; i++) {
        let activeClass = (i === 0) ? ' show active' : '';
        if (typeof op.content[i].id === 'undefined') {
          op.content[i].id = mtapp.temporaryId('tab-');
        }
        tabHead.push(
          '<li class="nav-item">' +
          '<a class="nav-link' + activeClass + '" data-toggle="tab" href="#' + op.content[i].id + '" role="tab">' + op.content[i].label + '</a>' +
          '</li>'
        );
        tabBody.push('<div class="tab-pane fade' + activeClass + '" id="' + op.content[i].id + '" role="tabpanel"></div>');
      }

      $(op.pointer)[op.method](
        '<div class="card text-center my-6">' +
          '<div class="card-header">' +
           '<ul class="nav nav-tabs card-header-tabs" role="tablist">' + tabHead.join('') + '</ul>' +
          '</div>' +
          '<div class="card-body tab-content text-left">' + tabBody.join('') + '</div>' +
        '</div>'
      );

      for (let i = 0; i < tabCount; i++) {
        let tabId = op.content[i].id;
        let selector = op.content[i].selector;
        $(selector).each(function () {
          $('#' + tabId).append(this);
        });
      }
    },


    /**
     * 記事編集画面のフィールドのドラッグ&ドロップを無効化します。
     */
    sortDisabled: function () {
      const $sortable = $('#sortable');
      if ($sortable.length) {
        $sortable.sortable({ disabled: true });
        const $field = $sortable.find('div.sort-enabled').removeClass('sort-enabled');
        $field.find('svg:first').parent().next().addClass('pl-4').css('font-weight', 600).end().remove();
      }
    },

    /**
     * ブログ記事・ウェブページの編集画面の各フィールドをカスタマイズします。
     *
     * Updated: 2019/03/15
     *
     * @param {Object} options
     * @param {String} options.basename 各フォーム要素のベースネーム
     * @param {String} options.label 変更後のラベル名
     * @param {String} options.addClass 追加するクラス名
     * @param {String} options.hint ヒントに表示させたいメッセージ
     * @param {String} options.showField  強制表示('show')、強制表示('hide')(注:basename が body か more の場合はタブの表示制御）
     * @param {String} options.showParent  強制表示('show')、強制非表示('hide') (注:showParent は、basename が body か more のみ）
     * @param {Boolean} options.custom カスタムフィールドの場合 true
     * @param {Boolean} options.widget ウィジェットの場合 true
     * @param {Boolean} options.edit 非編集モードにする場合 true
     * @returns {*|jQuery|HTMLElement}
     */
    customize: function(options){

      const op = $.extend({
        basename: '',
        label: '',
        addClass: '',
        hint: '',
        showField: '',
        showParent: '',
        custom: false,
        widget: false,
        edit: false
      }, options);

      const opL = op.label + '',
        opH = op.hint + '',
        opC = op.custom,
        opW = op.widget,
        opE = op.edit,
        opB = opC ? 'customfield_' + op.basename : op.basename + '';
      let $field, $label, $tab, $hover;

      // basenameが空だったら何もしない
      if (opB === '') {
        alert('basenameが設定されていません');
        return;
      }

      // $field,$labelを取得
      switch (opB) {
        case 'body':
          $field = $('#text-field');
          $tab   = $field.find('#editor-header div.tab:eq(0)');
          $label = $field.find('#editor-header label:eq(0) a');
          $hover = $label;
          break;
        case 'more':
          $field = $('#text-field');
          $tab   = $field.find('#editor-header div.tab:eq(1)');
          $label = $field.find('#editor-header label:eq(1) a');
          $hover = $label;
          break;
        case 'assets':
          $field = $('#assets-field');
          $label = $field.find('h2 span');
          $hover = $field;
          break;
        default:
          if (opW) {
            $field = $('#entry-' + opB + '-widget');
            $label = $field.find('.mt-widget__title').eq(0);
          } else {
            $field = $('#' + opB + '-field');
            $label = $field.find('label').eq(0);
          }
          $hover = $field;
          break;
      }

      // フィールドにクラス名を追加
      if (op.add_class) {
        op.addClass = op.add_class;
      }
      if (op.addclass) {
        op.addClass = op.addclass;
      }
      if (op.addClass !== '') {
        $field.addClass(op.addClass);
      }

      // ラベルの変更
      if (opL !== '') {
        $label.text(opL);
        if (opB === 'title') {
          $field.find('div.field-header').show().end()
            .find('#title').attr('placeholder', opL);
        }
      }

      // フィールドの表示・非表示
      const opS = op.show_field ? op.show_field + '': op.showField + '';
      if (opS === 'show') {
        if (opB === 'body' || opB === 'more') {
          $label.closest('div.tab').removeClass('d-none');
        }
        else {
          $field.removeClass('d-none').addClass('d-block');
        }
      }
      else if (opS === 'hide' && opB !== 'body' && opB !== 'more') {
        $field.addClass('d-none');
      }
      else if (opS === 'hide' && (opB === 'body' || opB === 'more')) {
        $label.closest('div.tab').addClass('d-none');
      }

      // テキストフィールドの表示・非表示
      op.showParent = op.show_parent ? op.show_parent + '': op.showParent + '';
      if ((opB === 'body' || opB === 'more') && op.showParent === 'hide') {
        $field.css({
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px'
        });
      }
      else if ((opB === 'body' || opB === 'more') && op.showParent === 'show') {
        $field.removeAttr('style');
      }

      // ヒントの表示
      if (opH) {
        $field.mtapp('showHint', { text: opH });
      }

      // 非編集モード
      if (opE && $field.find('.mt-draggable__content').length) {
        $field.find('.mt-draggable__content').addClass('d-none').after('<button type="button" class="btn btn-default ml-5">編集</button>').next('button').on('click.mtappcustomize', function(){
          $(this).prev().removeClass('d-none');
          $(this).remove();
        });
      }
      return $field;
    },


    /**
     * 選択されたカテゴリを監視する（記事編集画面）
     */
    startObserveCategoryChange: function () {
      const categoryIds = document.getElementById('category-ids');
      if (categoryIds) {
        const $categoryIds = $('#category-ids');
        mtappVars.selectedCategories = categoryIds.value;
        window.setInterval(function () {
          if (mtappVars.selectedCategories !== categoryIds.value) {
            mtappVars.selectedCategories = categoryIds.value;
            $categoryIds.trigger('mtappCategoryChanged', [categoryIds.value]);
          }
        }, 150);
      }
    },


    /**
     * body 要素に対して初期化処理を実行します。
     */
    initBody: function () {
      $('body')
      .addClass('blog-id-' + mtappVars.blog_id + ' author-id-' + mtappVars.author_id)
      .data('MTAppAssetFieldsIDs', []);
    },


    /**
     * 初期化します。
     */
    init: function () {

      if (top !== window && typeof mtappDialogEdit === 'undefined') {

        // アセットモーダルの場合の処理
        if (location.search.indexOf('__mode=list_asset') !== -1
          && location.search.indexOf('_type=asset') !== -1
          && location.search.indexOf('dialog_view=1') !== -1) {

          if (window.top.mtappVars.assetField.fieldId !== '') {
            const setSelectedItem = function () {
              const selectedId = $('#select_asset [name="id"]').val();
              if (selectedId) {
                window.top.mtappVars.assetField.assetId = selectedId;
                // すでに登録されているアセットの詳細情報の JSON を取得しておく
                const $assetTable = $('#asset-table');
                if ($assetTable.length) {
                  $assetTable.find('td.cb :hidden').each(function () {
                    if (this.value) {
                      window.top.mtappVars.assetField.assetList[$(this).attr('id')] = this.value;
                    }
                  });
                }
              }
            };
            $(window).on('beforeunload.assetField', setSelectedItem);
            $('.close[data-dismiss="modal"], .mt-close-dialog').on(function () {
              $(window).off('beforeunload.assetField');
            });
          }
        }
        // END アセットモーダルの場合の処理
        return;
      }

      // システムが利用するデータ等を保存しておく場所を作成
      if (typeof mtappVars._system === 'undefined') {
        mtappVars._system = {};
      }

      // input のカスタムイベントを設定
      mtappVars.eventInput;
      try {
        mtappVars.eventInput = new CustomEvent('input');
      } catch (e) {
        mtappVars.eventInput = document.createEvent('UIEvents');
        mtappVars.eventInput.initEvent('input', false, false);
      }

      // 保存ボタンコントロールを初期化
      this.submitButtonControl('init');

      // 管理画面のURLを取得
      mtappVars.adminScript = location.href.replace(/\?.*/, '');

      // .mt-dialog の表示状態を監視するイベントを設定
      mtappVars.MTAppObsDialog = {
        dialog: null,
        open: false,
        interval: 800,
        callbackTargetSelector: '',
        obs: function () {
          if (mtappVars.MTAppObsDialog.dialog === null) {
            mtappVars.MTAppObsDialog.dialog = $('div.mt-dialog,div.mt-modal').not('#mtapplisting-dialog');
          }
          const timeoutId = setTimeout(mtappVars.MTAppObsDialog.obs, mtappVars.MTAppObsDialog.interval);
          // ダイアログが開いたことを記録
          if (mtappVars.MTAppObsDialog.dialog.is(':visible') && mtappVars.MTAppObsDialog.open === false) {
            mtappVars.MTAppObsDialog.open = true;
          }
          // ダイアログが開いた後に閉じられたとき
          else if (mtappVars.MTAppObsDialog.dialog.is(':hidden') && mtappVars.MTAppObsDialog.open === true) {
            mtappVars.MTAppObsDialog.open = false;
            if (mtappVars.MTAppObsDialog.callbackTargetSelector) {
              $(mtappVars.MTAppObsDialog.callbackTargetSelector).trigger('MTAppDialogClosed');
            }
            clearTimeout(timeoutId);
          }
        }
      };

      // アセットアップロード用フィールドを初期化
      this.assetField.init();

      // サイドバーの開閉ボタンを追加
      this.sidebarCollapse();

      // オーバーレイ・リッチエディタを初期化
      this.overlayEditor.init();

      // body に対しての初期化処理
      this.initBody();

      // コンテンツタイプのフィールドを取得しておく
      this.getContentDataFields();

      // `コンテンツタイプの編集` 画面に `columnGroup` の設定を書き出す UI を追加する
      // this.columnGroupSettingUI();

      // 選択されたカテゴリを監視する（記事編集画面）
      this.startObserveCategoryChange();

    }

  };

})(jQuery, window, document, window.mtappVars);

const mtapp = new BP();

(function ($, mtappVars) {

  const methods = {

    /**
     * .mtapp('tooltip', options)
     *
     * 指定した要素にマウスオーバーするとカーソルに追随するツールチップを表示します。
     * html オプション、title 属性、alt 属性の値の優先順位でツールチップで表示します。
     *
     * Updated: 2018/06/22
     *
     * @param {Object} options
     * @param {String} options.html ツールチップに表示させるテキスト（HTML）
     * @param {String} options.className ツールチップにセットされるクラス名
     * @param {Boolean} options.remove `true` をセットすると適用した `tooltip` を削除します。
     * @returns {*}
     */
    tooltip: function(options){

      const op = $.extend({
        html: '',
        className: '',
        remove: false
      }, options);

      return this.each(function () {

        if (op.remove) {
          $(this).off('mouseenter.mtappTooltip').off('mouseleave.mtappTooltip').off('mousemove.mtappTooltip');
          return;
        }

        if (op.text && op.html === '') {
          op.html = op.text;
        }

        if (typeof op.className !== 'string' || op.className === '') {
          op.className = 'bg-light';
        }

        const $this = $(this);
        const $tooltip = $('#mtapp-tooltip').addClass(op.className);
        let target, tipText;

        if (op.html !== '') {
          tipText = op.html;
        }
        else {
          target = this.title ? 'title' : 'alt',
            tipText = $this.attr(target);
        }

        $this.on({
          'mouseenter.mtappTooltip': function (e) {
            if (op.html === '') {
              $this.attr(target, '');
            }
            $tooltip.stop(true, true).fadeIn('fast').html(tipText).css({
              position: 'absolute',
              top: e.pageY - 20,
              left: e.pageX + 20
            });
          },
          'mouseleave.mtappTooltip': function () {
            if (op.html === '') {
              $this.attr(target, tipText);
            }
            $tooltip.fadeOut('fast');
          },
          'mousemove.mtappTooltip': function (e) {
            $tooltip.css({
              top: e.pageY - 20,
              left: e.pageX + 20
            });
          }
        });
      });
    },


    /**
     * .mtapp('enableEdit', options)
     *
     * input:text, textarea を readonly にする
     *
     * Updated: 2018/06/06
     *
     * @param {Object} options
     * @param {Object} options.text ボタンのテキスト
     * @returns {*}
     */
    enableEdit: function (options) {

      const op = $.extend({ text: '編集' }, options);

      return this.each(function () {
        if (this.value === '') {
          return;
        }
        const $this = $(this);
        $this.wrap('<div class="form-inline"></div>');
        $this.prop('readonly', true);
        const $btn = $('<button class="btn btn-default ml-2" type="button">' + op.text + '</button>').on('click', function () {
          $(this).hide().prev().prop('readonly', false).parent().removeClass('form-inline');
          return false;
        });
        $this.after($btn);
      });
    },

    /**
     * .mtapp('inlineEdit', options)
     *
     * input:text, textarea を readonly にする
     *
     * Updated: 2018/06/06
     *
     * @param {Object} options
     * @param {Object} options.edit インラインエディットモードを切り替えるボタンのテキスト
     * @param {Boolean} options.force 常にインラインエディットモードにする場合(true)
     * @returns {*}
     */
    inlineEdit: function (options) {

      const op = $.extend({
        edit: '編集',
        force: false
      }, options);

      return this.each(function () {
        const $this = $(this);
        const $btn = $('<button class="btn btn-default ml-3" type="button">' + op.edit + '</button>').on('click', function () {
          $(this).hide()
            .prev().show().addClass('edited')
            .prev().hide();
          return false;
        });
        let thisValue = $this.val();
        if (op.force || thisValue !== '') {
          thisValue = thisValue !== '' ? thisValue : '...';
          $this.before('<span>' + thisValue + '</span>').after($btn).hide();
        }
      });
    },

    /**
     * .mtapp('tabToSpace', options)
     *
     * `textarea` でタブキーが押されたときに、スペースなどの文字列を挿入します。
     *
     * Updated: 2018/06/22
     *
     * @param {Object} options
     * @param {String} options.text タブキーが押されたときに入力される文字列。初期値は半角スペース4つ。
     * @returns {*}
     */
    tabToSpace: function(options) {

      const op = $.extend({ text: '    ' }, options);

      return this.each(function () {
        $(this).on('keydown', function (e) {
          const keycode = e.which || e.keyCode;
          if (keycode == 9) {
            $(this).insertAtCaret(op.text);
            return false;
          }
        });
      });
    },

    /**
     * .mtapp('removeVal')
     *
     * 指定した `input:text` `textarea` に入力された値をクリアするボタンを付けます。
     *
     * Updated: 2018/06/22
     *
     * @returns {*}
     */
    removeVal: function() {
      return this.each(function () {
        const $this = $(this).css('padding-right', '16px').wrap('<div class="mtapp-remove-val" style="position:relative;" />');
        const $wrap = $this.parent();
        const outerH = $wrap.outerHeight();
        const posTop = outerH / 2 - 7;
        $wrap
        .append('<img class="mtapp-remove-val-btn" alt="" src="' + mtappVars.static_plugin_path + 'images/cancel-gray.png" style="top: ' + posTop + 'px;" />')
        .children('img').on('click', function(){
          $this.val('').trigger('focus');
        });
      });
    },

    /**
     * .mtapp('showHint')
     *
     * 要素にマウスオーバーしたときに、要素上部に吹き出しスタイルでテキストを表示します。ブロック要素に対して利用できます。
     * 吹き出しは$(foo)内にprependされます。
     *
     * Updated: 2019/03/15
     *
     * @param {Object} options
     * @param {String} options.html ヒントに表示するコンテンツを指定します。
     * @returns {*}
     */
    showHint: function(options){
      const op = $.extend({ html: '' }, options);
      return this.each(function () {
        if (op.text && op.html === '') {
          op.html = op.text;
        }
        const balloon = [
            '<div class="balloon d-none">',
              '<div class="balloon-content">' + op.html + '</div>',
              '<div class="balloon-arrow">',
                '<div class="line10"></div>',
                '<div class="line9"></div>',
                '<div class="line8"></div>',
                '<div class="line7"></div>',
                '<div class="line6"></div>',
                '<div class="line5"></div>',
                '<div class="line4"></div>',
                '<div class="line3"></div>',
                '<div class="line2"></div>',
                '<div class="line1"></div>',
              '</div>',
            '</div>'
          ]

        const $balloon = $(this).prepend(balloon.join('')).find('div.balloon');

        $(this).hover(
          function(){
            $balloon.removeClass('d-none').addClass('d-block').css('margin-top', '-' + $balloon.outerHeight() + 'px');
          },
          function(){
            $balloon.removeClass('d-block').addClass('d-none');
          }
        );
      });
    },

    /**
     * .mtapp('fieldSplit')
     *
     * 1つのフィールドを分割して複数の値をカンマ区切りなどで保存出来るようになります。
     *
     * Updated: 2018/06/22
     *
     * @param {Object} options
     * @param {Number} options.splitCount 分割する数
     * @param {String} options.separator 区切り文字列
     * @param {Array} options.placeholders プレースホルダーの配列
     * @param {Array} options.styles style属性を追加する場合はその配列
     * @param {Array} options.classes クラスを追加する場合はその配列
     * @param {Boolean} options.debug trueを設定すると元のフィールドを表示します。
     * @returns {*}
     */
    fieldSplit: function(options){

      const op = $.extend({
        splitCount: 2,
        separator: ',',
        placeholders: [],
        styles: [],
        classes: [],
        debug: false
      }, options);

      return this.each(function(){
        const $self = $(this);
        const separator = op.separator;
        const splitCount = op.splitCount > 1 ? op.splitCount: 2;
        const selfVal = $self.val() ? $self.val().split(op.separator) : [];

        if (!op.debug) {
          $self.hide();
        }

        const input = [];
        let value = '', placeholders = '', styles = '', classes = '';
        op.placeholders = op.placeholder ? op.placeholder : op.placeholders;
        for (let i = 0; i < splitCount; i++) {
          value = (selfVal[i]) ? selfVal[i] : '';
          placeholders = (op.placeholders[i]) ? op.placeholders[i] : '';
          styles = (op.styles[i]) ? op.styles[i] : '';
          classes = (op.classes[i]) ? op.classes[i] : '';
          input.push('<div class="' + classes + '"><input type="text" class="form-control" value="' + value + '" placeholder="' + placeholders + '" style="' + styles + '" /></div>');
        }
        const $div = $('<div class="row MTAppFieldSplit">' + input.join('') + '</div>').find('.form-control').each(function(){
          $(this).on({
            'blur': function(){
              const values = [];
              $(this).closest('.MTAppFieldSplit').find('.form-control').each(function(){
                values.push($(this).val());
              });
              $self.val(values.join(separator));
            },
            'keydown': function(e){
              if (e.which == 13) {
                const values = [];
                $(this).closest('.MTAppFieldSplit').find('.form-control').each(function(){
                  values.push($(this).val());
                });
                $self.val(values.join(separator));
              }
            }
          });
        }).end();
        $self.after($div);
      });
    },

    /**
     * 今日、明日、明後日をワンクリックで入力できます。
     *
     * Updated: 2018/06/28
     *
     * @returns {*}
     */
    dateAssist: function () {
      const d = new Date();
      const buttons =
        '<div class="btn-group d-block mt-2" role="group">' +
        '<button type="button" class="btn btn-default" data-days="0">今日</button>' +
        '<button type="button" class="btn btn-default" data-days="1">明日</button>' +
        '<button type="button" class="btn btn-default" data-days="2">明後日</button>' +
        '</div>';

      const getDateItem = function (ms) {
        const d = new Date(ms);
        return d.getFullYear() + '-' + mtapp.zeroPad(d.getMonth() + 1, 2) + '-' + mtapp.zeroPad(d.getDate(), 2);
      };

      return this.each(function () {
        const $this = $(this);
        $this.after(buttons).next().on('click', '.btn', function () {
          const days = $(this).attr('data-days') - 0;
          const ms = d.getTime() + (days * 24 * 60 * 60 * 1000);
          $this.val(getDateItem(ms));
        });
      });
    },

    /**
     * 全角数字を半角に変換、半角数字以外の文字を削除、最小値・最大値の設定などができます。
     *
     * Updated: 2018/06/28
     *
     * @param {Object} options
     * @param {Number} options.min 入力できる最小値を指定します。
     * @param {Number} options.max 入力できる最大値を指定します。
     * @param {Number} options.zeroPad ゼロパディングする場合の桁数を指定します。
     * @returns {*}
     */
    numChecker: function (options) {

      const op = $.extend({
        min: null,
        max: null,
        zeroPad: 0
      }, options);

      return this.each(function () {

        const $this = $(this);
        const $alert = $this.before('<div class="alert alert-danger mtapp-numChecker" role="alert" style="display: none;"></div>').prev();

        $this.on('blur', function () {

          let num = '' + $(this).val().trim();
          num = mtapp.toInt(num, true);
          $this.val(num);
          if (num === '') {
            return true;
          }

          num = Number(num);

          if (typeof num !== 'number' || isNaN(num)) {
            $alert.text('数値以外の文字が含まれています。').show();
            return;
          }
          else {
            $alert.hide();
          }

          if (typeof op.min === 'number' && typeof op.max === 'number') {
            if (num < op.min || op.max < num) {
              $alert.html('入力できる値は<strong class="mx-1">' + op.min + '</strong>から<strong class="mx-1">' + op.max + '</strong>までです。').show();
            }
            else {
              $alert.hide();
            }
          }
          else if (typeof op.min === 'number') {
            if (num < op.min) {
              $alert.html('入力できる最小値は<strong class="mx-1">' + op.min + '</strong>までです。').show();
            }
            else {
              $alert.hide();
            }
          }
          else if (typeof op.max === 'number') {
            if (op.max < num) {
              $alert.html('入力できる最大値は<strong class="mx-1">' + op.max + '</strong>までです。').show();
            }
            else {
              $alert.hide();
            }
          }

          if (op.zeroPad !== 0) {
            op.zeroPad = op.zeroPad - 0;
            num = mtapp.zeroPad(num, op.zeroPad);
          }

          $this.val(num);
        }).trigger('blur');
      });
    },

    /**
     * 入力された数値から税込み価格、税抜き価格を算出します。
     *
     * Updated: 2020/01/31
     *
     * @param {Object} options
     * @param {Number} options.rate 消費税率（例）5%の時は0.05と書く
     * @param {String} options.rounding 端数処理 => floor（切り捨て）、ceil（切り上げ）、round（四捨五入）

     * @returns {*}
     */
    taxAssist: function (options) {

      const op = $.extend({
        rate: 0.1,
        rounding: 'floor'
      }, options);

      const buttons =
        '<div class="btn-group d-block mt-2" role="group">' +
        '<button type="button" class="btn btn-default taxes_included">税込み</button>' +
        '<button type="button" class="btn btn-default after_taxes">税抜き</button>' +
        '<button type="button" class="btn btn-default" disabled>リセット</button>' +
        '</div>';

      return this.each(function () {

        const $this = $(this);

        $this.after(buttons).next().on('click', 'button', function () {
          const $button = $(this);
          if ($button.hasClass('taxes_included')) {
            $this.data('original', $this.val());
            $button.removeClass('btn-default').addClass('btn-dark');
            $button.next().prop('disabled', true);
            $button.next().next().prop('disabled', false);
            const val = Number($this.val()) * (1 + op.rate);
            $this.val(rounding(val, op.rounding));
          }
          else if ($button.hasClass('after_taxes')) {
            $this.data('original', $this.val());
            $button.removeClass('btn-default').addClass('btn-dark');
            $button.prev().prop('disabled', true);
            $button.next().prop('disabled', false);
            const val = Number($this.val()) / (1 + op.rate);
            $this.val(rounding(val, op.rounding));
          }
          else {
            $this.val($this.data('original'));
            $button.siblings().each(function () {
              $(this).prop('disabled', false).removeClass('btn-dark').addClass('btn-default');
            });
          }
          $button.prop('disabled', true);
        });
      });

      function rounding(num, roundingType){
        switch (roundingType) {
          case 'floor':
            num = Math.floor(num);
            break;
          case 'ceil':
            num = Math.ceil(num);
            break;
          case 'round':
            num = Math.round(num);
            break;
        }
        return num;
      }
    },

    /**
     * フィールドに最大文字数を設定します
     *
     * Updated: 2018/08/10
     *
     * @param {Object} options
     * @param {Object} options.l10n 言語設定
     * @param {Number} options.maxLength The maxLength option is required. You have to set not less than 1.

     * @returns {*}
     */
    maxLength: function (options) {

      const op = $.extend({
        l10n: null,
        maxLength: 0
      }, options);

      if (op.maxLength < 1) {
        return;
      }
      /* ==================================================
          L10N
      ================================================== */
      const l10n = {};
      if (mtappVars.language === 'ja') {
        l10n.characters = '文字';
        l10n.maximumCharacters = '最大文字数';
        l10n.remainingCharacters = '残り文字数';
        l10n.overCharacters = '最大文字数を[_1]文字超えています';
      }
      else {
        l10n.characters = '';
        l10n.maximumCharacters = 'Maximum characters';
        l10n.remainingCharacters = 'Remaining characters';
        l10n.overCharacters = '[_1] characters over';
      }
      if (op.l10n) {
        $.extend(l10n, op.l10n);
      }
      /*  L10N  */

      return this.each(function (i) {

        const maxLength = op.maxLength;

        $(this).after(
          '<div class="valid-feedback"></div>' +
          '<div class="invalid-feedback"></div>'
        );

        const $valid = $(this).next();
        const $invalid = $valid.next();

        $(this).on('keyup', function () {
          const $this = $(this);
          const count = $this.val().length;
          if (count > maxLength) {
            $this.removeClass('is-valid').addClass('is-invalid');
            $invalid.text(statusText(maxLength, count, l10n));
            mtapp.submitButtonControl('hasError');
          }
          else {
            $valid.text(statusText(maxLength, count, l10n));
            $this.removeClass('is-invalid').addClass('is-valid');
            mtapp.submitButtonControl('submittable');
          }
        }).trigger('keyup');
      });

      function statusText (maxLength, count, l10n) {
        if (!count) {
          return l10n.maximumCharacters + ' : ' + maxLength + l10n.characters;
        }
        else if (count <= maxLength) {
          return l10n.remainingCharacters + ' : ' + (maxLength - count) + l10n.characters;
        }
        else if (count > maxLength) {
          const overCount = count - maxLength;
          return l10n.overCharacters.replace(/\[_1\]/, overCount);
        }
      }
    },

    /**
     * テキストフィールドを複数選択チェックボックスにします。
     *
     * Updated: 2018/06/28
     *
     * @param {Object} options
     * @param {Object} options.l10n
     * @param {Object} options.label カンマ区切りの文字列か{'key1':'value1','key2':'value2'}のハッシュ
     * @param {Object} options.maxCount チェックできる最大値を設定
     * @param {Object} options.maxCountMessage チェックできる最大値を超えたときにエラーメッセージ
     * @param {Object} options.insert 'before' or 'after'
     * @param {Object} options.add ユーザーがチェックボックスを追加できるようにする場合はtrue
     * @param {Object} options.sort 'ascend'（昇順）,'descend'（降順）
     * @param {Object} options.debug 'hide' or 'show' 元のテキストフィールドを非表示にするか否か
     * @returns {*}
     */
    multiCheckbox: function (options) {

      const op = $.extend({
        l10n: null,
        label: '',
        maxCount: 999999999,
        maxCountMessage: '',
        add: false,
        sort: '',
        debug: false
      }, options);

      const l10n = {};
      if (mtappVars.language === 'ja') {
        l10n.maxCountMessage = '選択出来る上限数を超えました。';
        l10n.addItem = '項目を追加';
      }
      else {
        l10n.maxCountMessage = 'Exceed the check limit.';
        l10n.addItem = 'Add an item';
      }
      if (op.l10n) {
        $.extend(l10n, op.l10n);
      }

      return this.each(function () {

        const $this = $(this);

        // 最大文字数表記を非表示にする
        $this.next().filter(function () {
          return this.innerHTML.indexOf('最大文字数') !== -1;
        }).hide();

        const savedItems = this.value ? mtapp.tidySeparater(this.value, ',').split(',') : [];
        const labelType = $.type(op.label);
        const labels = [];
        const items = [];
        const containerId = mtapp.temporaryId();
        const $container = $this.after('<div id="' + containerId + '"></div>').next();

        if (!op.debug) {
          $this.hide();
        }

        if (labelType === 'object') {
          if (op.sort === '') {
            for (let key in op.label) {
              labels.push(makeLabel(op.label[key], key));
            }
          }
          else {
            const keys = sortHashKey(op.label, op.sort);
            for (let i = 0, n = keys.length; i < n; i++) {
              labels.push(makeLabel(op.label[keys[i]], keys[i]));
            }
          }
        }
        else if (labelType === 'string' || labelType === 'array') {
          switch (labelType) {
            case 'string':
              if (op.label === '' && $this.attr('title')) {
                $.merge(items, mtapp.tidySeparater($this.attr('title')).split(','));
              }
              else {
                $.merge(items, mtapp.tidySeparater(op.label).split(','));
              }
              op.label = $.merge([], items);
              break;
            case 'array':
              $.merge(items, op.label);
              break;
          }
          if (savedItems.length > 0 && op.add) {
            for (let i = 0, n = savedItems.length; i < n; i++) {
              if ($.inArray(savedItems[i], op.label) === -1) {
                items.push(savedItems[i]);
              }
            }
          }
          if (op.sort == 'ascend') {
            items.sort();
          }
          else if (op.sort === 'descend') {
            items.sort();
            items.reverse();
          }
          for (let i = 0, n = items.length; i < n; i++) {
            labels.push(makeLabel(items[i], items[i]));
          }
          if (op.add) {
            labels.push('<input class="mcb-add-item form-control" type="text" value="" placeholder="' + l10n.addItem + '">');
          }
        }

        $container.html(labels.join('')).on('click', 'input:checkbox', function (e) {
          const checkValues = [];
          const checkedCount = $container.find(':checked').length;
          if (checkedCount > op.maxCount) {
            if (op.maxCountMessage) {
              alert(op.maxCountMessage);
            }
            else {
              alert(l10n.maxCountMessage);
            }
            return false;
          }
          $container.find(':checked').each(function () {
            checkValues.push(this.value);
          });
          $this.val(checkValues.join(','));
        });

        if (savedItems.length > 0) {
          $container.find(':checkbox').each(function () {
            const v = this.value;
            if ($.inArray(v, savedItems) !== -1) {
              $(this).prop('checked', true);
            }
          })
        }

        if (op.add) {
          // key:value で入力するとキーと値を別のものにできる。
          $container.find('input.mcb-add-item').on('keypress', function(e){
            const keycode = e.which || e.keyCode;
            if (keycode == 13) {
              let value = $(this).val();
              if (!value) {
                return false;
              }
              value = value.split(':');
              if (value.length === 1) {
                $.merge(value, value);
              }
              $(this).val('').before(makeLabel(value[1], value[0])).prev().find('input:checkbox').trigger('click');
              return false;
            }
            return true;
          });
        }

        function makeLabel(label, value){
          const tempId = mtapp.temporaryId();
          return '' +
            '<div class="form-check form-check-inline">' +
            '<input class="form-check-input" id="' + tempId + '" type="checkbox" value="' + value + '">' +
            '<label class="form-check-label" for="' + tempId + '">' + label + '</label>' +
            '</div>';
        }

        // 連想配列のキーを並べ替える
        function sortHashKey(obj, rule){ // rule = 'ascend','descend'
          var keys = [], values = [];
          for (let key in obj) {
            keys.push(key);
          }
          switch (rule) {
            case 'ascend':
              keys.sort();
              break;
            case 'descend':
              keys.sort();
              keys.reverse();
              break;
          }
          return keys;
        }
      });
    },

    /**
     * 入力候補を表示します。
     *
     * Updated: 2020/01/31
     *
     * @param {Object} options
     * @param {Array} options.list 候補になるリスト
     * @param {Boolean} options.hideMaxLengthText (最大文字数: 255)の表記を残したい場合は false
     * @returns {*}
     */
    suggest: function (options) {
      const op = $.extend({
        list: [],
        hideMaxLengthText: true
      }, options);

      return this.each(function(){

        const $this = $(this);

        // 最大文字数表記を非表示にする
        if (op.hideMaxLengthText) {
          $this.next().filter(function () {
            return this.innerHTML.indexOf('最大文字数') !== -1;
          }).hide();
        }

        const suggestionId = mtapp.temporaryId('suggestion-');
        const completionId = mtapp.temporaryId('completion-');

        $.data(this, 'suggestList', op.list);
        $this.closest('div.field').css('overflow','visible');
        $this.after(
          '<div class="field-suggestion" id="' + suggestionId + '" style="display:none;">' +
          '<div class="field_completion" id="' + completionId + '"></div>' +
          '</div>'
        );

        const outerElm = document.getElementById(suggestionId);
        const innerElm = document.getElementById(completionId);

        $(innerElm).on('click', 'div', function(){
          const v = $this.val().replace(/(, )?([^,]*)$/,'$1');
          $this.val(v + $(this).text() + ', ');
        });
        $this.on({
          'blur': function () {
            setTimeout(function _hide(){
              outerElm.style.display = 'none';
            }, 100);
          },
          'keydown': function (e) {
            const keycode = e.which || e.keyCode;
            if (keycode == 13) {
              const $highlight = $(innerElm).children('.complete-highlight');
              if ($highlight.length > 0) {
                const v = $this.val().replace(/(, )?([^,]*)$/,'$1');
                $this.val(v + $highlight.text() + ', ');
              }
              outerElm.style.display = 'none';
              return false;
            }
          },
          'keyup': function (e) {
            const $highlight = $(innerElm).children('.complete-highlight');
            switch (e.which) {
              // down
              case 40: {
                if ($highlight[0].nextSibling) {
                  $highlight.removeClass('complete-highlight').addClass('complete-none').next().addClass('complete-highlight');
                }
                return false;
              }
              // up
              case 38: {
                if ($highlight[0].previousSibling) {
                  $highlight.removeClass('complete-highlight').addClass('complete-none').prev().addClass('complete-highlight');
                }
                return false;
              }
              default: {
                const contain = [];
                let first = true;
                const v = $(this).val().match(/(?:, )?([^,]*)$/)[1].toLowerCase();
                if (v !== '') {
                  for (let i = 0, n = op.list.length; i < n; i++) {
                    if (op.list[i].toLowerCase().indexOf(v) >= 0) {
                      if (first) {
                        contain.push('<div class="complete-highlight">' + op.list[i] + '</div>');
                        first = false;
                        outerElm.style.display = 'block';
                      }
                      else {
                        contain.push('<div class="complete-none">' + op.list[i] + '</div>');
                      }
                    }
                  }
                  innerElm.innerHTML = contain.join('');
                  if (contain.length == 0) {
                    outerElm.style.display = 'none';
                  }
                }
                else {
                  outerElm.style.display = 'none';
                }
                break;
              }
            } // switch
          }
        });
        return false;
      }); // each
    },

    /**
     * テキストフィールドを項目を自由に増やせるドロップダウンリストに変更することが出来ます。
     *
     * Updated: 2018/06/29
     *
     * @param {Object} options
     * @param {Boolean} options.debug
     * @param {Boolean} options.dynamic
     * @param {String} options.text カンマ区切りの文字列か連想配列と配列の入れ子。value|labelと分けることも可能（要separateMode: true）。
     * @param {String} options.addText
     * @param {String} options.promptMsg
     * @param {String} options.initGroupName
     * @param {Boolean} options.separateMode
     * @param {String} options.selected
     * @returns {*}
     */
    dynamicSelect: function (options) {

      const op = $.extend({
        debug: false,
        dynamic: true,
        text: '',
        addText: '項目を追加する',
        promptMsg: '追加する項目名を入力',
        initGroupName: '選択中アイテム',
        separateMode: false,
        selected: null
      }, options);

      return this.each(function () {
        const $this = $(this);
        const thisValue = $this.val() || '';
        if (!op.debug) {
          $this.hide();
        }

        const options = [];
        let selected = '';
        let exist = false;
        if (typeof op.text == 'string') {
          const items = op.text.split(',');
          if (!op.separateMode && $.inArray(thisValue, items) < 0) {
            items.unshift(thisValue);
          }
          for (let i = 0, n = items.length; i < n; i++) {
            const attr = separate(items[i]);
            if (thisValue == attr[0]) {
              selected = ' selected="selected"';
            }
            else {
              selected = '';
            }
            options.push('<option value="' + attr[0] + '"' + selected + '>' + attr[1] + '</option>');
          }
        }
        else if (typeof op.text == 'object') {
          for (let key in op.text) {
            options.push('<optgroup label="' + key + '">');
            for (let i = 0, n = op.text[key].length; i < n; i++) {
              const attr = separate(op.text[key][i]);
              if (thisValue == attr[0]) {
                selected = ' selected="selected"';
                exist = true;
              }
              else {
                selected = '';
              }
              options.push('<option value="' + attr[0] + '"' + selected + '>' + attr[1] + '</option>');
            }
            options.push('</optgroup>');
          }
          if (thisValue && !exist) {
            options.unshift('<optgroup label="' + op.initGroupName + '"><option value="' + thisValue + '">' + thisValue + '</option></optgroup>');
          }
        }
        const option_add = op.dynamic ? '<option value="_add_">' + op.addText + '</option>': '';
        const select = [
          '<select class="dynamic_select form-control">',
          options.join(''),
          option_add,
          '</select>'
        ];
        const $select = $(select.join('')).change(function () {
          if ($(this).val() === '_add_') {
            const $option = $(this).find('option');
            const size = $option.size();
            const addition = prompt(op.promptMsg,'');
            if (addition) {
              $this.val(addition);
              $option.eq(size-1).before('<option value="' + addition + '" selected="selected">' + addition + '</option>');
            }
            else {
              $(this).val($this.val());
            }
          }
          else {
            $this.val($(this).val());
          }
          if (op.selected && typeof op.selected === 'function') {
            op.selected($this.val());
          }
        });
        if (op.separateMode) {
          $select.find('option').last().remove();
        }
        $this.after($select);

        function separate (str) {
          const array = [];
          if (str.match(/([^|]+)\|([^|]+)/)) {
            array[0] = RegExp.$1;
            array[1] = RegExp.$2;
          }
          else {
            array[0] = str;
            array[1] = str;
          }
          return array;
        }
      });
    },

    /**
     * カスタムフィールドで追加したテキストエリアなどにオーバーレイ・リッチエディタを適用します。
     */
    overlayEditor: function () {

      return this.each(function () {

        const value = this.value;
        const $this = $(this).hide();
        let id = $this.attr('id');
        if (!id) {
          id = mtapp.temporaryId();
          $this.attr('id', id);
        }

        $this.after('' +
          '<div id="' + id + '-view" class="mtapp-overlay-editor">' + value + '</div>' +
          '<button id="' + id + '-button" type="button" class="btn btn-default mt-3">編集</button>'
        );
        $('#' + id + '-button').on('click', function () {
          const id = $(this).attr('id').replace(/-button/, '');
          const data = document.getElementById(id).value;
          mtapp.overlayEditor.open(id, data);
        });

      });
    }

  };

  $.fn.mtapp = function (method) {

    if (method === 'list') {
      const methodList = ["==================\n.mtapp method list\n=================="];
      for (let key in methods) {
        methodList.push(key);
      }
      console.warn(methodList.join("\n"));
      return true;
    }
    else if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    }
    else if (typeof method === 'object' || ! method) {
      return methods.init.apply(this, arguments);
    }
    else {
      alert('Oops! "' +  method + '" does not exist on MTAppjQuery.');
    }

  };

})(jQuery, window.mtappVars);


/**
 * Utilities
 */
(function ($) {

  $.fn.extend({

    /**
     * .hasClasses(classes);
     *
     * `classes` で指定したクラス名が設定されている場合は `true` を返します。
     *
     * Updated: 2018/06/22
     *
     * @param {String} classes チェックするクラス名を半角スペースで区切って指定します。配列で指定することもできます。
     * @returns {boolean}
     */
    hasClasses: function (classes) {
      if (typeof classes === 'string') {
        classes = classes.trim();
        classes = /^\./.test(classes)
          ? classes.replace(/^\./, '').split('.')
          : classes.split(/\s+/);
      }
      const count = classes.length;
      let matches = 0;
      for (let i = 0; i < count; i++) {
        if (this.hasClass(classes[i])){
          matches++;
        }
      }
      return count === matches;
    },

    /**
     * .notClasses(classes);
     *
     * `classes` で指定したクラス名が設定されていない場合に `true` を返します。
     *
     * Updated: 2018/06/22
     *
     * @param {String} classes チェックするクラス名を半角スペースで区切って指定します。配列で指定することもできます。
     * @returns {boolean}
     */
    notClasses: function(classes) {
      return !this.hasClasses(classes);
    },

    /**
     * .noScroll(styles, containerSelector);
     *
     * 要素をスクロールに追随させます。
     *
     * Updated: 2018/06/22
     *
     * @param {Object} styles .noScroll() を適用した要素に設定するCSSがある場合はObjectで設定する
     * @param {String} containerSelector .noScroll() を適用した要素の親要素のセレクタを指定し、無限スクロールになってしまうのを防ぎます。
     * @returns {*}
     */
    noScroll: function (styles, containerSelector){
      if (this.length < 1) return;
      if (containerSelector) {
        $(containerSelector).css('overflow-y', 'hidden');
      }
      return this.each(function () {
        const $this = $(this);
        const $parent = $this.parent().css('position', 'relative');
        const parentHeight = $parent.height();
        const $document = $(document);
        const getThisTop = function () {
          return $document.scrollTop() - $parent.offset().top + 10;
        };
        $parent.height(parentHeight);
        $this.css({'position': 'absolute', 'z-index': 9999});
        if (styles) {
          $this.css(styles);
        }
        $(window).scroll(function () {
          let thisTop = getThisTop();
          if (thisTop < 0) {
            thisTop = 0;
          }
          if ($document.height() - $document.scrollTop() < $this.height()) {
            return;
          }
          $this.stop().animate(
            {top: thisTop + 'px'},
            'fast',
            'swing'
          );
        });
      });
    },

    /**
     * .insertAtCaret(text);
     *
     * テキストエリアのカーソルの位置に文字列を挿入します。
     *
     * Updated: 2018/06/22
     *
     * @param {String} text カーソルの位置に挿入する文字列を指定します。
     * @returns {*}
     */
    insertAtCaret: function (text)  {
      return this.each(function () {
        const self = $(this)[0];
        self.trigger('focus');
        if (typeof document.selection !== 'undefined') {
          const range = document.selection.createRange();
          range.text = text;
          range.select();
        }
        else {
          const val = self.value;
          const beforeCaret = self.selectionStart;
          const afterCaret = beforeCaret + text.length;
          self.value = val.substr(0, beforeCaret) + text + val.substr(beforeCaret);
          self.setSelectionRange(afterCaret, afterCaret);
        }
      });
    }

  });

})(jQuery);
