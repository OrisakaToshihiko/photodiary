document.addEventListener('DOMContentLoaded', function () {
    const gridElement = document.querySelector('.grid');
    const sortField = document.querySelector('.grid-control-field.sort-field');
    const filterField = document.querySelector('.grid-control-field.filter-field');
    const authorField = document.querySelector('.grid-control-field.author-field');
    let dragOrder = [];
    let sortFieldValue;
    let authorFieldValue;

    var grid = new Muuri('.grid', {
        dragEnabled: false,
        showDuration: 600,
        showEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        sortData: {
            time(item, element) {
              return element.getAttribute('data-time') || '';
            },
            color(item, element) {
                return element.getAttribute('data-color') || '';
              },
            author(item, element) {
              return element.getAttribute('data-author') || '';
            }
          },
        dragAutoScroll: {
          targets: [window],
          sortDuringScroll: false,
          syncAfterScroll: false,
        },
      });

      window.grid = grid;

      //
      // Grid helper functions
      //

        // Search field binding.
        function initDemo() {
            // Reset field values.
            // searchField.value = '';
            // [sortField, filterField].forEach((field) => {
            // [sortField, filterField,authorField].forEach((field) => {
              [authorField].forEach((field) => {//この書き方あってるのか？
              field.value = field.querySelectorAll('option')[0].value; //ここ聞く
            });

            // Set inital search query, active filter, active sort value and active layout.
            // searchFieldValue = searchField.value.toLowerCase();
            // sortFieldValue = sortField.value;

            updateDragState();

            // Search field binding.
            // searchField.addEventListener('keyup', function () {
            //   var newSearch = searchField.value.toLowerCase();
            //   if (searchFieldValue !== newSearch) {
            //     searchFieldValue = newSearch;
            //     filter();
            //   }
            // });

            // Filter, sort and layout bindings.
            // filterField.addEventListener('change', filter);
            // sortField.addEventListener('change', sort);
            authorField.addEventListener('change', author);
            // layoutField.addEventListener('change', updateLayout);

            // Add/remove items bindings.
            // addButton.addEventListener('click', addItems);
            // gridElement.addEventListener('click', (e) => { //聞く
            //   if (e.target.matches('.grid-card-remove')) {
            //     removeItem(grid.getItem(e.target.closest('.grid-item')));
            //   }
            // });
          }

          function filter(onFinish = null) {
            const filterFieldValue = filterField.value;
            grid.filter(
              (item) => {
                const element = item.getElement();
                // const isSearchMatch =
                //   !searchFieldValue ||
                //   (element.getAttribute('data-title') || '').toLowerCase().indexOf(searchFieldValue) > -1;
                const isFilterMatch =
                  !filterFieldValue || filterFieldValue === element.getAttribute('data-color');
                // return isSearchMatch && isFilterMatch;
                return isFilterMatch;
              },
              { onFinish: onFinish }
            );
          }

          function author(onFinish = null) {
            const authorFieldValue = authorField.value;
            grid.filter(
              (item) => {
                const element = item.getElement();

                const isFilterMatch =
                  !authorFieldValue || authorFieldValue === element.getAttribute('data-author');
                return isFilterMatch;
              },
              { onFinish: onFinish }
            );
          }


    function sort() {
        var currentSort = sortField.value;
        if (sortFieldValue === currentSort) return;

        updateDragState();

        // If we are changing from "order" sorting to something else
        // let's store the drag order.
        if (sortFieldValue === 'order') {
          dragOrder = grid.getItems();
        }

        // Sort the items.
        grid.sort(
          currentSort === 'time' ? 'time' : currentSort === 'color' ? 'color time' :currentSort === 'author' ? 'color author time' : dragOrder　
          //三項演算子　if elseif else
          // currentSort === color
        );

        // Update active sort value.
        sortFieldValue = currentSort;
      }


      function updateDragState() {
      //   if (sortField.value === 'order') {
      //     gridElement.classList.add('drag-enabled');
      //   } else {
      //     gridElement.classList.remove('drag-enabled');
      //   }
       }
  initDemo();

  const modalWrapper = document.getElementById('js-modal');
  const modalContentsVisible = document.getElementsByClassName('modal-content_visible');
  const openModalItem = document.getElementsByClassName('item');
  const closeModalBtn = document.getElementById('js-modal_close');

  // モーダルの表示
  for (let i = 0; i < openModalItem.length; i++) {
    openModalItem[i].onclick = function () {
      
      // 枠の表示
      modalWrapper.classList.add('modal_visible');

      // クリックしたカードに応じた中身の表示
      const id = this.id;
      const modalContent = document.getElementById(id+'-content');
      modalContent.classList.add('modal-content_visible');
    };
  };

  // モーダルの非表示化
  const closeModal =
  closeModalBtn.addEventListener('click', function() {

    // 枠の非表示化
    modalWrapper.classList.remove('modal_visible');

    // 中身の表示クラス削除
    for (let i = 0; i < modalContentsVisible.length; i++) {
      modalContentsVisible.item(i).classList.remove('modal-content_visible');
    }
  });
});
