exports.table = function() {
  var gData = null;
  var gCategoryName = null;
  var gColumnTypes = null;
  var gSelectedCol = {};
  var gSelectedRow = {};
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
    Object.entries(gData).forEach(function(key, value) {
      if (value in gSelectedRow) {
        selectedDataSet.push(key);
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

  function generateSvgBars(chunks, w, h, groups, maxCount, xBase, yBase) {
    var html = `<svg class="customChart" width="${w}" height="${h}" style="fill: ${gColors[0]}"><g>`;
    const margin = 10;
    const width = (w - margin * 2) / groups;
    
    for (var idx=0; idx<chunks.length; idx++) {
      const item = chunks[idx];
      // console.log(idx);
      // console.log(item);
      const height = h * item.data.length / maxCount;
      const x = margin+width*idx;
      const y = h-height;
      const content = `<b>${item.lo}-${item.hi}</b><br>count: <b>${item.data.length}</b>`;
      html += `<rect onmousemove="mytable.barMouseMove(${xBase+x}, ${y-margin+yBase}, '${content}');" onmouseout="mytable.barMouseOut();" onmouseover="mytable.barMouseOver();" class="bar" x="${x}" width="${width}" y="${y}" height="${height}"></rect>`;
    }

    html += "</g></svg>";

    return html;
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
    var res = 
      `<div><b>${title}</b></div>
      <div>${generateSvgBars(chunks, 200, 200, groups, maxCount, cid*200, yBase)}</div>
      <div>
        <div style="float: left;">${minVal}</div>
        <div style="float: right;">${maxVal}</div>
      </div>`;

    return res;
  }

  function generateSvgPies(chunks, w, h, total) {
    var html = `<svg class="customChart" width="${w}" height="${h}" viewBox="0 0 32 32"><g>`;
    

    var currCount = 0;
    var i=0;
    html += `<circle r="16" cx="16" cy="16" style="fill:gray;" />`;
    Object.entries(chunks).forEach(([_,item]) => {
      dasharrayValue = ((total - currCount) / parseFloat(total)) * 100;
      html += `<circle r="8" cx="16" cy="16" style="stroke:${gColors[i]};stroke-dasharray:calc(${dasharrayValue} * 31.42px / 62.5) ${dasharrayValue}px" class="pieChartCircle"></circle>`;
      i = i + 1;
      currCount += item.length;
    });
    html += "</g></svg>";

    // console.log(html);
    return html;
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

  function createElementHelper(tagName, content, attr=null, func=null) {
    var tag = document.createElement(tagName);
    tag.innerHTML = content;
    if (attr != null && func != null) {
      tag.setAttribute(attr, func);
    }

    return tag;
  }

  function emptyChild(ele) {
    while (ele.firstChild) {
      ele.removeChild(ele.firstChild);
    }
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

    ele.innerHTML = buildTable();
  }

  publicScope.showDataset = function(data) {
    gData = data;

    var thead = document.querySelector('.tableFixHead > table > thead');
    emptyChild(thead);

    const numberOfColumns = Object.keys(data[0]).length;
    var i = 0;
    var tr = document.createElement("tr");
    Object.entries(data[0]).forEach(([key, value]) => {
      if (i == numberOfColumns-1) {
        gCategoryName = key;
        tr.append(createElementHelper("th", createSvgPieChart(key, data)));
      } else if (isNaN(value)) {
        tr.append(createElementHelper("th", createSvgPieChart(key, data), "onclick", `mytable.selectMe(this, '${key}');`));
      } else {
        tr.append(createElementHelper("th", createSvgBarChart(key, data, 10.0, i), "onclick", `mytable.selectMe(this, '${key}');`));
      }
      i++;
    });
    thead.append(tr);

    var tbody = document.querySelector('.tableFixHead > table > tbody');
    emptyChild(tbody);
    Object.entries(data).forEach(([key, item]) => {
      var tr = document.createElement("tr");
      tr.setAttribute("onclick", `mytable.selectMe(this, '${key}');`);
      Object.entries(item).forEach(([_, value]) => {
        tr.append(createElementHelper("td", value));
      });
      tbody.append(tr);
    });
  }

  publicScope.selectMe = function(selected, id) {
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

  publicScope.barMouseMove = function(x, y, content) {
    document.querySelector(".tooltiptext").style.top = `${y}px`;
    document.querySelector(".tooltiptext").style.left = `${x}px`;
    document.querySelector(".tooltiptext").innerHTML = content;
  }

  publicScope.barMouseOver = function() {
    document.querySelector(".tooltiptext").style.visibility = "visible";
  }

  publicScope.barMouseOut = function() {
    document.querySelector(".tooltiptext").style.visibility = "hidden";
  }

  return publicScope;
}
