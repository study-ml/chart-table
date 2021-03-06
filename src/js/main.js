exports.table = function() {
  var gEle = null;
  var gData = null;
  var gCategoryName = "";
  var gColumnTypes = null;
  var gSelectedCol = {};
  var gSelectedRow = {};
  var gColorMap = {};
  var gColors = null;
  var gMinSelectedRow2Show = null;
  var gMinSelectedCol2Show = null;
  var gOnSelect = null;

  function canShowChart() {
    if (Object.keys(gSelectedCol).length == gMinSelectedCol2Show && 
      Object.keys(gSelectedRow).length >= gMinSelectedRow2Show) {
      return true;
    } else {
      return false;
    }
  }

  function prepareSelectedData() {
    if (!canShowChart()) {
      return {};
    }

    var selectedDataSet = [];
    // console.log(gData);
    Object.entries(gData).forEach(function(key, value) {
      // console.log(`key:`);
      // console.log(key);
      // console.log("value:");
      // console.log(value);
      if (value in gSelectedRow) {
        selectedDataSet.push(gData[value]);
        // console.log(gData[value][gCategoryName]);
      }
    });
    
    // console.log(gSelectedRow);
    // console.log(gSelectedCol);
    // console.log(selectedDataSet);
    var selectedColumnNames = [];
    for (var i=0; i<gMinSelectedCol2Show; i++) {
      selectedColumnNames.push(Object.keys(gSelectedCol)[i]);
    }

    return {
      selectedRows: selectedDataSet, 
      selectedColumns: selectedColumnNames, 
      selectedColorMap: gColorMap,
      categoryName: gCategoryName,
    };
  }

  function toggleRow(id) {
    if (id in gSelectedRow) {
      delete gSelectedRow[id]; 
    } else {
      gSelectedRow[id] = "";
    }
    
    // console.log(gSelectedRow);
  }

  function toggleCol(id) {
    if (id in gSelectedCol) {
      delete gSelectedCol[id]; 
    } else {
      gSelectedCol[id] = "";
    }
    
    // console.log(gSelectedCol);
  }

  function toggleTrainingDataSet(selected, id) {
    if (selected.tagName.toLowerCase() == "th") {
      toggleCol(id);
    } else {
      toggleRow(id);
    }
  }

  function canAddClass(selected) {
    if (selected.tagName.toLowerCase() == "th" && Object.keys(gSelectedCol).length == gMinSelectedCol2Show) {
      return false;
    } else {
      return true;
    }
  }

  function splitData2Group(row, maxVal, minVal, groups) {
    const range = (maxVal - minVal) / groups;
    var res = [];
    for (var i=0; i<groups; i++) {
      res.push({
        data: row.filter(function(x) {
          if (i == 0) {
            return (x >= minVal + (i*range)) && (x <= minVal + ((i+1)*range));
          } else {
            return (x > minVal + (i*range)) && (x <= minVal + ((i+1)*range));
          }
        }),
        lo: Math.round((minVal + (i*range)) * 100) / 100,
        hi: Math.round((minVal + ((i+1)*range)) * 100) / 100
      });
    }

    return res;
  }

  function outerHTML(element) {
    var container = document.createElement("div");
    container.appendChild(element.cloneNode(true));

    return container.innerHTML;
  }

  function generateSvgBars(chunks, w, h, groups, maxCount, xBase, yBase) {
    var svg = document.createElement('svg');
    var g = document.createElement('g');
    
    svg.setAttribute('class', 'customChart');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('style', `fill: ${gColors[0]}`);

    const margin = 10;
    const width = (w - margin * 2) / groups;

    for (var idx=0; idx<chunks.length; idx++) {
      const item = chunks[idx];
      const height = h * item.data.length / maxCount;
      const x = margin+width*idx;
      const y = h-height;
      const content = `<b>${item.lo}-${item.hi}</b><br>count: <b>${item.data.length}</b>`;
      
      var rect = document.createElement('rect');
      rect.setAttribute('class', 'bar');
      rect.setAttribute('x', x);
      rect.setAttribute('width', width);
      rect.setAttribute('y', y);
      rect.setAttribute('height', height);
      rect.addEventListener('mousemove', function() {
        // console.log("move!!");
        barMouseMove(xBase+x, y-margin+yBase, content);
      });
      rect.addEventListener('mouseover', function() {
        // console.log("over!!");
        barMouseOver();
      });
      rect.addEventListener('mouseout', function() {
        // console.log("out!!");
        barMouseOut();
      });
      g.appendChild(rect);
    }

    svg.appendChild(g);
    return svg;
  }

  function createSvgBarChart(title, data, groups, cid) {
    const row = data.map(x => x[title]);
    const minVal = Math.min(...row);
    const maxVal = Math.max(...row);
    const chunks = splitData2Group(row, maxVal, minVal, groups);
    const maxCount = Math.max(...chunks.map(x => x.data.length));
    // console.log(chunks);
    // console.log(`max count: ${maxCount}`);
    
    const yBase = document.getElementsByClassName("tableFixHead")[0].offsetTop;
    var divOuter = document.createElement('div');
    var divTitle = document.createElement('div');
    divTitle.innerHTML = `<div><b>${title}</b></div>`;

    var divBarChart = document.createElement('div');
    divBarChart.appendChild(generateSvgBars(chunks, 200, 200, groups, maxCount, cid*200, yBase))

    var divRange = document.createElement('div');
    divRange.innerHTML = `
      <div>
        <div style="float: left;">${minVal}</div>
        <div style="float: right;">${maxVal}</div>
      </div>`;

    divOuter.appendChild(divTitle);
    divOuter.appendChild(divBarChart);
    divOuter.appendChild(divRange);
    return outerHTML(divOuter);
  }

  function generateSvgPies(chunks, w, h, total) {
    var html = `<svg class="customChart" width="${w}" height="${h}" viewBox="0 0 32 32"><g>`;
    
    const offset = 20;
    var currCount = 0;
    var i=0;
    html += `<circle r="16" cx="16" cy="16" style="fill:gray;" />`;
    Object.entries(chunks).forEach(([key,item]) => {
      dasharrayValue = ((total - currCount) / parseFloat(total)) * 100;
      // console.log(`total ${total}, len: ${item.length}, curr: ${currCount}, val: ${dasharrayValue}`);
      
      html += `<circle r="8" cx="16" cy="16" style="stroke:${gColors[i]};stroke-dasharray:calc(${dasharrayValue} * 31.42px / 62.5) ${dasharrayValue+offset}px" class="pieChartCircle"></circle>`;
      gColorMap[key] = gColors[i];
      
      i = i + 1;
      currCount += item.length;
    });
    html += "</g></svg>";

    // console.log(html);
    return html;
  }

  function createNumerChart(title, data) {
    var res = 
      `<div><b>${title}</b></div>
      <br>
      <div style="font-size: 36px; color: ${gColors[0]}"><b>${getDistinctValue(data, title)}</b></div>
      <div>Distinct Value</div>`;

    return res;
  }

  function createSvgPieChart(title, data) {
    const row = data.map(x => x[title]);
    const chunks = row.reduce((total, curr) => {
      if (total.hasOwnProperty(curr)) {
        total[curr].push(curr);
      } else {
        total[curr] = [];
        total[curr].push(curr);
      }
      return total;
    }, {});

    // console.log(chunks);
    var res = 
      `<div><b>${title}</b></div>
      <div>${generateSvgPies(chunks, 200, 200, row.length)}</div>`;

    return res;
  }

  function buildTable() {
    return `
      <span class="tooltiptext">Tooltip text</span>
      <div class="tableFixHead" style="height: ${gHeight}px;">
        <table>
          <thead>
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>`;
  }

  function createElementHelper(tagName, content, id=null) {
    var tag = document.createElement(tagName);
    tag.innerHTML = content;
    if (id != null) {
      tag.addEventListener('click', function() {
        selectMe(tag, id);
      });
    }

    return tag;
  }

  function emptyChild(ele) {
    while (ele.firstChild) {
      ele.removeChild(ele.firstChild);
    }
  }

  function resetTbl(data, categoryName) {
    gData = data;
    gSelectedCol = {};
    gSelectedRow = {};

    if (categoryName == "") {
      gCategoryName = Object.keys(data[0])[Object.keys(data[0]).length-1];
    }
    
    gEle.replaceChildren();
    // gEle.appendChild(buildTable());
    gEle.innerHTML = buildTable();
  }

  function getDistinctValue(jsonArr, columnName) {
    return jsonArr.map(x => x[columnName]).filter((value, idx, self)=>{return self.indexOf(value)===idx}).length;
  }

  function validData(data) {
    if (data == null) {
      return false;
    }

    if (!Array.isArray(data)) {
      return false;
    }

    if (data.length < 1) {
      return false;
    }

    return true;
  }

  let publicScope = {};
  publicScope.initTbl = function(ele, options) {
    var extend = function(a, b){
      for (var key in b) {
        if (b.hasOwnProperty(key)) {
          a[key] = b[key];
        }
      }
      return a;
    }

    options = extend({
      columnTypes: [],
      colors: ["#FFB000", "#DC267F", "#648FFB", "#785EF0"],
      minSelectedRow2Show: 3,
      minSelectedCol2Show: 2,
      height: 360,
      onSelect: null,
    }, options);

    gColumnTypes = options.columnTypes;
    gColors = options.colors;
    gMinSelectedRow2Show = options.minSelectedRow2Show;
    gMinSelectedCol2Show = options.minSelectedCol2Show;
    gOnSelect = options.onSelect;
    gHeight = options.height;
    gEle = ele;
  }

  publicScope.showDataset = function(data, categoryName="") {
    if (!validData(data)) {
      return;
    }

    resetTbl(data, categoryName);

    var thead = document.querySelector('.tableFixHead > table > thead');
    emptyChild(thead);

    var i = 0;
    var tr = document.createElement("tr");
    Object.entries(data[0]).forEach(([key, value]) => {
      const distinctValues = getDistinctValue(data, key);
      if (gCategoryName == key) {
        if (distinctValues < 6) {
          tr.append(createElementHelper("th", createSvgPieChart(key, data)));
        } else {
          tr.append(createElementHelper("th", createNumerChart(key, data)));
        }
      } else if (isNaN(value)) {
        if (distinctValues < 6) {
          tr.append(createElementHelper("th", createSvgPieChart(key, data), key));
        } else {
          tr.append(createElementHelper("th", createNumerChart(key, data), key));
        }
      } else {
        tr.append(createElementHelper("th", createSvgBarChart(key, data, 10.0, i), key));
      }
      i++;
    });
    thead.append(tr);

    var tbody = document.querySelector('.tableFixHead > table > tbody');
    emptyChild(tbody);
    Object.entries(data).forEach(([key, item]) => {
      var tr = document.createElement("tr");
      tr.addEventListener('click', function() {
        selectMe(tr, key);
      });
      Object.entries(item).forEach(([_, value]) => {
        tr.append(createElementHelper("td", value));
      });
      tbody.append(tr);
    });
  }

  function selectMe(selected, id) {
    // selected.classList.toggle('trainingdata');

    if (selected.classList.contains("trainingdata")) {
      selected.classList.remove("trainingdata");
      toggleTrainingDataSet(selected, id);
    } else {
      if (canAddClass(selected)) {
        selected.classList.add("trainingdata");
        toggleTrainingDataSet(selected, id);
      }
    }

    if (gOnSelect) {
      gOnSelect(prepareSelectedData());
    }
  }

  function barMouseMove(x, y, content) {
    document.querySelector(".tooltiptext").style.top = `${y}px`;
    document.querySelector(".tooltiptext").style.left = `${x}px`;
    document.querySelector(".tooltiptext").innerHTML = content;
  }

  function barMouseOver() {
    document.querySelector(".tooltiptext").style.visibility = "visible";
  }

  function barMouseOut() {
    document.querySelector(".tooltiptext").style.visibility = "hidden";
  }

  return publicScope;
}
