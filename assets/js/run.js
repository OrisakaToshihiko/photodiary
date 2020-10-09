document.addEventListener('DOMContentLoaded', function () {
    const sortField = document.querySelector('.grid-control-field.sort-field');
    const filterField = document.querySelector('.grid-control-field.filter-field');
    var grid = new Muuri('.grid', {
        dragEnabled: true,
        showDuration: 600,
        showEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        sortData: {
            color(item, element) {
                return element.getAttribute('data-color') || '';
              }
            // color: function (item, element) {
            //   return element.getAttribute('data-color');
            // }
            // bar: function (item, element) {
            //   return element.getAttribute('data-bar').toUpperCase();
            // }
          }
      });

      
    //   grid.refreshSortData();
    //   grid.sort('color');

        // Search field binding.
        function initDemo() {
            // Reset field values.
            // searchField.value = '';
            // [sortField, filterField].forEach((field) => {
            [filterField].forEach((field) => {//この書き方あってるのか？
              field.value = field.querySelectorAll('option')[0].value; //ここ聞く
            });
        
            // Set inital search query, active filter, active sort value and active layout.
            // searchFieldValue = searchField.value.toLowerCase();
            // sortFieldValue = sortField.value;
        
            // updateDragState();
        
            // Search field binding.
            // searchField.addEventListener('keyup', function () {
            //   var newSearch = searchField.value.toLowerCase();
            //   if (searchFieldValue !== newSearch) {
            //     searchFieldValue = newSearch;
            //     filter();
            //   }
            // });
        
            // Filter, sort and layout bindings.
            filterField.addEventListener('change', filter);
            // sortField.addEventListener('change', sort);
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
        

    function sort() {
        var currentSort = sortField.value;
        if (sortFieldValue === currentSort) return;
    
        // updateDragState();
    
        // If we are changing from "order" sorting to something else
        // let's store the drag order.
        if (sortFieldValue === 'order') {
          dragOrder = grid.getItems();
        }
    
        // Sort the items.
        grid.sort(
          //currentSort === 'title' ? 'title' : currentSort === 'color' ? 'color title' : dragOrder　
          //三項演算子　if elseif else
          currentSort === color
        );
    
        // Update active sort value.
        sortFieldValue = currentSort;
      }
      function updateDragState() {
        if (sortField.value === 'order') {
          gridElement.classList.add('drag-enabled');
        } else {
          gridElement.classList.remove('drag-enabled');
        }
      }
      initDemo();

    });