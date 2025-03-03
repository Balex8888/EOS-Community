import React from 'react';
import { HorizontalBar } from 'react-chartjs-2';


const RamCost = props => {
    let dt = [];
    let dataDisplay = [];
    let colours = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#000000'];
    if (props.bill) {
        const total = Object.keys(props.bill).map(x => { return Math.abs(props.bill[x].ram) }).reduce((a, b) => { a = a + b; return a; })

        let i = 0;
        for (let action in props.bill) {
            dataDisplay.push(action + ':' + props.bill[action].ram);

            dt.push({
                label: action,
                backgroundColor: colours[i],
                borderColor: 'white',
                borderWidth: 0,
                data: [props.bill[action].ram / total]
            })
            i++;
        }


    }

    const data = props.bill ? { datasets: dt } : null;


    let options = {
        hover: {
            animationDuration: 0
        },
        animation: {
            onComplete: function () {
                var chartInstance = this.chart,
                ctx = chartInstance.ctx;
                ctx.fillStyle = 'white';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.font = 'bold 70% Courier';
                ctx.lineWidth = 1;
                ctx.globalCompositeOperation = "destination-over";

                this.data.datasets.forEach(function (dataset, i) {
                    var meta = chartInstance.controller.getDatasetMeta(i);
                    meta.data.forEach(function (bar, index) {
                        var data = dataDisplay[i];
                        if (dataset.data[index] > 0) ctx.fillText(data, bar._model.x - 10, bar._model.y - 10);
                        else if (dataset.data[index] < 0) ctx.fillText(data, bar._model.x + 80, bar._model.y -10 );

                    });
                });
            }
        },
        tooltips: {
            yAlign: 'left',
            position: 'nearest',
            enabled: false,
            callbacks: {
                label: function (tooltipItems) {
                    return dt[tooltipItems.datasetIndex].label + ' :' + props.bill[dt[tooltipItems.datasetIndex].label].ram + 'bytes';
                }
            }
        },
        legend: {
            display: false
        },
        title: {
            display: false
        },
        data,
        scales: {
            xAxes: [{
                stacked: true,
                barPercentage: 1.0,
                ticks: {
                    display: false
                },
                gridLines: {
                    display: false,
                    drawBorder: false,
                }
            }],
            yAxes: [{
                stacked: true,
                barThickness: 20,
                barPercentage: 1.0,
                ticks: {
                    display: false
                },
                gridLines: {
                    display: false,
                    drawBorder: false,
                }
            }]
        },

    }




    return (
        <div className="RamCostContainer">
            {props.bill ? <HorizontalBar data={data} options={options} height={20} /> : null}
        </div>
    )

}

export default RamCost;
