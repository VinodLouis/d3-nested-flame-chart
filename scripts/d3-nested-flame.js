"use strict";


function drawNestedFlames(ele,data,key){
	console.log(ele,d);

	// set the dimensions and margins of the graph
	var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

	var shadeC = d3.schemeCategory20;
	// set the ranges
	var x = d3.scaleBand()
          .range([0, width])
          .padding(0.1);
	var y = d3.scaleLinear()
          .range([height, 0]);
          
	//appned svg
	var svg = d3.select("#"+ele).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  	.append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");

  	// Scale the range of the data in the domains
  	x.domain(data.map(function(d) { return d.country; }));
  	y.domain([0, d3.max(data, function(d) { return d.shelter; })]);

  	// append the main group
 	var flameGroup = svg.selectAll(".flame-group")
    	.data(data);

    flameGroup.enter().append("g")
    .each(function(d,i){
    	var nestedFlame = d3.select(this)
      .selectAll('rect')
      .data(["shelter","house","food"]);

      nestedFlame.enter()
      .append('rect')
      .attr('x', function(el, j) { return x(d[key]) + (5 * j); })
      .attr('width', function(el, j) { return x.bandwidth() - (5 * j * 2); })
      .attr('y', function(el, j) { return y(d[el]); })
      .attr("height", function(el,j) { return height - y(d[el]); })
      .attr('fill', function(el,j) { return shadeC[j]; });
    });
}