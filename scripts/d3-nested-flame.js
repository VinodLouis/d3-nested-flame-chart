"use strict";

// https://github.com/wbkd/d3-extended
d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};
d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

/*
    ele : chart playground
    data : data to display
    key : x axis key
    colors : if provided use them or default
*/
function drawNestedFlames(ele, data, key, colors) {
    //console.log(ele, d);

    //safe sort
    data.forEach((el) => {
        el.data = el.data.sort((a, b) => {
            return (a.value < b.value);
        });
    });

    //get all props
    var props = data[0].data.map((el) => el.prop);
    //console.log(props);


    // set the dimensions and margins of the graph
    var candleWidth = 80
    var margin = {
            top: 10,
            right: 50,
            bottom: 10,
            left: 50
        },
        width = (candleWidth * data.length * 1.1) - margin.left - margin.right,
        height = (width * 0.65) - margin.top - margin.bottom;
    var innerPadding = data.length;

    //Line function for flame curve
    var lineFunctionCurve = d3.line()
        .x((d, i)=>{
            return d.x;
        })
        .y((d)=>{
            return d.y
        }) 
        .curve(d3.curveCardinalClosed.tension(0.25));

    //Line function for tooltip     
    var lineFunctionStraight = d3.line()
        .x((d, i)=>{
            return d.x;
        })
        .y((d)=>{
            return d.y
        }) 
        .curve(d3.curveLinearClosed);

    //If color provide use else assign default    
    var shadeC = d3.scaleOrdinal((colors && colors.length > 0) ? colors : d3.schemeCategory20);
    
    // set the ranges
    var x = d3.scaleBand()
        .range([0, width])
        .padding(0.15);
    
    var y = d3.scaleLinear()
        .range([height, 0]);

    //appned svg
    var svg = d3.select("#" + ele).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data in the domains
    x.domain(data.map((d)=>{
        return d[key];
    }));
    //Just to get an upper slug add100
    y.domain([0, 100+d3.max(data,(d)=>{ return d3.max(d.data,(d1)=>{ return d1.value; })})]);
    
    //add gradients
    svg.selectAll(".gradients").data(props).enter().append("linearGradient")
        .attr("id", (d) => {
            return "gradient-" + d
        })
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%")
        .selectAll("stop")
        .data((d, i) => {
            return [{
                    offset: "0%",
                    color: "#ffffff"
                },
                {
                    offset: "20%",
                    color: shadeC(d)
                }
            ]
        })
        .enter().append("stop")
        .attr("offset",(d)=>{
            return d.offset;
        })
        .attr("stop-color",(d)=>{
            return d.color;
        });


    var flameGroup = svg.selectAll(".flame-group")
        .data(data);

    //let all flames be under common g     
    flameGroup.enter().append("g")
        .attr("id", (d) => d[key])
        .attr("class", "flames")
        .on("mouseenter",(el, i)=>{
            //console.log(this);
            d3.selectAll(".tooltip").remove();
            var tooltip = svg.append("g").attr("id", "tooltip").attr("class", "tooltip")
                .on("mouseleave",(el, i)=>{
                    if (event.relatedTarget && event.relatedTarget.classList && event.relatedTarget.classList.contains("flames"))
                        return;
                    d3.selectAll(".tooltip").remove();
                    //console.log(event.relatedTarget.classList);
                });

            //draw tooltip    
            el.tooltipPoints = fntooltipPoints(el);
            tooltip.append("path")
                .attr("d", lineFunctionStraight(el.tooltipPoints))
                .attr("stroke", "#000000")
                .attr("fill", "#4682b4")
                .attr("stroke-width", 1)
                .attr("class", "tooltip tooltip-path")

            //draw tooltip rect    
            el.boxPoints = fnboxPoints(el);
            var box = tooltip.append("path")
                .attr("d", lineFunctionStraight(el.boxPoints))
                .attr("stroke", "#4682b4")
                .attr("fill", "#ffffff")
                .attr("stroke-width", 1)

            //tooltip title    
            tooltip.append("text")
                .attr("x", el.boxPoints[5].x)
                .attr("y", 15)
                .attr("class", "label-title")
                .text(el[key])

            //tooltip labels    
            tooltip.selectAll(".labels")
                .data(el.data)
                .enter()
                .append("a")
                .attr("xlink:href", (d, i) => {
                    return (d.link) ? d.link : ""
                })
                .attr("target", "_blank")
                .attr("class", (d, i) => {
                    return (d.link) ? "link" : "no-link"
                })
                .append("text")
                .attr("x", el.boxPoints[2].x + 5)
                .attr("y", (d, i) => {
                    return ((i + 1) * 15) + 15
                })
                .attr("stroke", (d, i) => {
                    return shadeC(d.prop)
                })
                .attr("class", "labels")
                .attr("stroke-width", 0.5)
                .text((d, i) => {
                    return d.prop + " " + d.value + ((d.link) ? "..." : "")
                });

            //send tooltip to back & g to front        
            d3.select("#" + d[key]).moveToFront();
            d3.select("#tooltip").moveToBack();
        })
        .on("mouseleave",(el, i)=>{
            if (event.relatedTarget && event.relatedTarget.classList && event.relatedTarget.classList.contains("tooltip"))
                return;
            d3.selectAll(".tooltip").remove();
            //console.log(event.relatedTarget.classList);
        })
        .each(function(d, i) {
            var nestedFlame = d3.select(this)
                .selectAll('rect')
                .data(d.data);

            /*nestedFlame.enter()
            .append('rect')
            .attr('x', function(el, j) { return x(d[key]) + (innerPadding * j); })
            .attr('width', function(el, j) { return x.bandwidth() - (innerPadding * j * 2); })
            .attr('y', function(el, j) { return y(d[el]); })
            .attr("height", function(el,j) { return height - y(d[el]); })
            .attr('fill', "none") //function(el,j) { return shadeC[j]; }
            .attr('stroke', function(el,j) { return shadeC[j]; })
            .attr("stroke-width", 1)*/

            nestedFlame.enter()
                .append("path")
                .attr("d",(el, j)=>{
                    var points = flamePointsPlot(el, j, d);
                    d.points = (d.points) ? d.points : points
                    return lineFunctionCurve(points);
                })
                .attr("stroke",(el, j)=>{
                    return shadeC(el.prop);
                })
                .attr("stroke-width", 1)
                //.attr("fill", function(el,j) { return shadeC(el.prop); });
                .attr("fill", (el, i)=>{
                    return "url(#gradient-" + el.prop + ")"
                })
                .on("mouseenter",function(el, i){
                    //console.log(this);
                    d3.select(this).attr("stroke-width", 3);
                })
                .on("mouseleave", function(el, i) {
                    d3.select(this).attr("stroke-width", 1)
                })
        });

    function fnboxPoints(wholeData) {
        var arrPoints = [];
        arrPoints.push(wholeData.tooltipPoints[2]);
        arrPoints.push({
            x: wholeData.tooltipPoints[2].x,
            y: wholeData.tooltipPoints[2].y - 70
        });
        arrPoints.push({
            x: wholeData.tooltipPoints[3].x,
            y: wholeData.tooltipPoints[3].y - 70
        });
        arrPoints.push(wholeData.tooltipPoints[3]);

        arrPoints.push({
            x: wholeData.points[7].x - 10,
            y: wholeData.tooltipPoints[3].y
        });
        arrPoints.push({
            x: wholeData.points[7].x,
            y: wholeData.tooltipPoints[3].y + 10
        });
        arrPoints.push({
            x: wholeData.points[7].x + 10,
            y: wholeData.tooltipPoints[3].y
        });

        return arrPoints;
    }

    function fntooltipPoints(wholeData) {
        var arrPoints = [];
        //console.log(wholeData);

        arrPoints.push(wholeData.points[8]);
        arrPoints.push(wholeData.points[6]);
        arrPoints.push({
            x: wholeData.points[7].x + candleWidth,
            y: 70
        });
        arrPoints.push({
            x: wholeData.points[7].x - candleWidth,
            y: 70
        });
        return arrPoints;
    }

    //POints are pushed in clock wise from 12o clock
    function flamePointsPlot(flameElement, ind, wholeData) {
        var arrPoints = [];
        var points = {
            top: {
                x: (x(wholeData[key]) + (innerPadding * ind) + (x.bandwidth() - (innerPadding * ind * 2)) / 10 + (x.bandwidth() - (innerPadding * ind * 2)) / 2),
                y: y(flameElement.value)
            },
            rightMiddleY: {
                x: (x(wholeData[key]) + (innerPadding * ind) + (x.bandwidth() - (innerPadding * ind * 2))),
                y: y(flameElement.value) + (height - y(flameElement.value)) / 2
            },
            bottom: {
                x: (x(wholeData[key]) + (innerPadding * ind) + (x.bandwidth() - (innerPadding * ind * 2)) / 2),
                y: y(flameElement.value) + (height - y(flameElement.value))
            },
            leftMiddleY: {
                x: x(wholeData[key]) + (innerPadding * ind),
                y: y(flameElement.value) + (height - y(flameElement.value)) / 2
            }
        }
        //push starting point (A)
        arrPoints.push(points.top);

        arrPoints.push({
            x: points.top.x + (x.bandwidth() - (innerPadding * ind * 2)) / 10,
            y: points.top.y + (points.rightMiddleY.y - points.top.y) / 8
        });

        //push 1st innner point
        arrPoints.push({
            x: points.rightMiddleY.x - (x.bandwidth() - (innerPadding * ind * 2)) / 4,
            y: points.top.y + (points.rightMiddleY.y - points.top.y) / 2
        });

        //the 1/2 right side (B)
        arrPoints.push(points.rightMiddleY);

        //push right 1/3 point
        arrPoints.push({
            x: points.rightMiddleY.x - (x.bandwidth() - (innerPadding * ind * 2)) / 4,
            y: points.rightMiddleY.y + (points.rightMiddleY.y - points.top.y) / 2
        });

        //elevation push right 1/3 point
        arrPoints.push({
            x: points.rightMiddleY.x,
            y: points.rightMiddleY.y + (points.rightMiddleY.y - points.top.y) / 3
        });

        arrPoints.push({
            x: points.bottom.x + (x.bandwidth() - (innerPadding * ind * 2)) / 2,
            y: points.bottom.y - (points.rightMiddleY.y - points.top.y) / 4
        });

        //the bottom point opp to A (C)
        arrPoints.push(points.bottom);
        arrPoints.push({
            x: points.bottom.x - (x.bandwidth() - (innerPadding * ind * 2)) / 2,
            y: points.bottom.y - (points.rightMiddleY.y - points.top.y) / 4
        });

        //the 1/2 left side
        arrPoints.push(points.leftMiddleY);

        //elevation push left 2/3 point
        arrPoints.push({
            x: points.leftMiddleY.x + (x.bandwidth() - (innerPadding * ind * 2)) / 8,
            y: points.leftMiddleY.y - (points.rightMiddleY.y - points.top.y) / 2
        });

        //inner point for above elevation
        arrPoints.push({
            x: points.leftMiddleY.x + (x.bandwidth() - (innerPadding * ind * 2)) / 5,
            y: points.leftMiddleY.y - (points.rightMiddleY.y - points.top.y) / 4
        });

        //a little outer curve
        arrPoints.push({
            x: points.leftMiddleY.x + (x.bandwidth() - (innerPadding * ind * 2)) / 3,
            y: points.leftMiddleY.y - (points.rightMiddleY.y - points.top.y) / 1.5
        });

        arrPoints.push({
            x: points.top.x - (x.bandwidth() - (innerPadding * ind * 2)) / 15,
            y: points.top.y + (points.rightMiddleY.y - points.top.y) / 8
        });

        return arrPoints;
    }
}