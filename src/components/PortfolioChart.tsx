import React, { useState } from 'react';
import StockDetailModal from './StockDetailModal';
import { getStockColor } from '../utils/stockColors';

interface PortfolioData {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  cost: number;
  change: number;
  changePercent: number;
}

interface PortfolioChartProps {
  data: PortfolioData[];
  onHover: (symbol: string | null) => void;
  hoveredStock: string | null;
  currencySymbol?: string;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data, onHover, hoveredStock, currencySymbol = '$' }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: PortfolioData; transform: string } | null>(null);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const totalValue = data.reduce((sum, stock) => sum + stock.value, 0);
  const centerX = 220;
  const centerY = 220;
  const radius = 140;

  let currentAngle = 0;

  const handleMouseMove = (event: React.MouseEvent, stockData: PortfolioData, sliceAngle: number, sliceStartAngle: number) => {
    if (!svgRef.current || !containerRef.current) return;

    // Get the actual SVG position and scale
    const svgRect = svgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = svgRect.width / 440; // 440 is the SVG viewBox width
    const scaleY = svgRect.height / 440; // 440 is the SVG viewBox height
    
    // Calculate the middle angle of the slice
    const middleAngle = sliceStartAngle + (sliceAngle / 2);
    const middleAngleRad = (middleAngle * Math.PI) / 180;
    
    // Calculate the actual center position in the scaled SVG
    const actualCenterX = centerX * scaleX;
    const actualCenterY = centerY * scaleY;
    
    // Position tooltip just outside the slice, following the slice angle
    const tooltipDistance = (radius + 30) * Math.min(scaleX, scaleY); // Responsive distance
    const sliceX = actualCenterX + tooltipDistance * Math.cos(middleAngleRad);
    const sliceY = actualCenterY + tooltipDistance * Math.sin(middleAngleRad);
    
    // Convert to container-relative coordinates
    const tooltipX = sliceX + (svgRect.left - containerRect.left);
    const tooltipY = sliceY + (svgRect.top - containerRect.top);
    
    // Determine transform based on angle to avoid tooltip going outside container
    const normalizedAngle = ((middleAngle % 360) + 360) % 360;
    let transformOrigin: string;
    
    if (normalizedAngle >= 315 || normalizedAngle < 45) {
      // Right side - tooltip to the right of slice
      transformOrigin = 'translate(0%, -50%)';
    } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
      // Bottom side - tooltip below slice
      transformOrigin = 'translate(-50%, 0%)';
    } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
      // Left side - tooltip to the left of slice
      transformOrigin = 'translate(-100%, -50%)';
    } else {
      // Top side - tooltip above slice
      transformOrigin = 'translate(-50%, -100%)';
    }
    
    setTooltip({
      x: tooltipX,
      y: tooltipY,
      data: stockData,
      transform: transformOrigin
    });
    onHover(stockData.symbol);
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    onHover(null);
  };

  const handleStockClick = (stock: PortfolioData) => {
    setSelectedStock({ symbol: stock.symbol, name: stock.name });
  };

  return (
    <div className="relative" ref={containerRef}>
      <svg
        ref={svgRef}
        width="440"
        height="440"
        className="mx-auto w-full h-auto max-w-md"
        viewBox="0 0 440 440"
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((stock, index) => {
          const percentage = (stock.value / totalValue) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          
          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (endAngle * Math.PI) / 180;
          
          const x1 = centerX + radius * Math.cos(startAngleRad);
          const y1 = centerY + radius * Math.sin(startAngleRad);
          const x2 = centerX + radius * Math.cos(endAngleRad);
          const y2 = centerY + radius * Math.sin(endAngleRad);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          // For single stock (100% of portfolio), create a full circle instead of a slice
          const isFullCircle = data.length === 1;
          const finalPathData = isFullCircle 
            ? `M ${centerX} ${centerY} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
            : pathData;
          
          currentAngle += angle;
          
          const isHovered = hoveredStock === stock.symbol;
          const adjustedRadius = isHovered ? radius + 10 : radius;
          
          return (
            <g key={stock.symbol}>
              <path
                d={finalPathData}
                fill={getStockColor(stock.symbol)}
                stroke="#1f2937"
                strokeWidth="2"
                className="transition-all duration-200 cursor-pointer"
                style={{
                  filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: `${centerX}px ${centerY}px`
                }}
                onMouseMove={(e) => handleMouseMove(e, stock, angle, startAngle)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleStockClick(stock)}
              />
            </g>
          );
        })}
        
        {/* Center circle for a donut chart effect */}
        <circle
          cx={centerX}
          cy={centerY}
          r="70"
          fill="#1f2937"
          stroke="#374151"
          strokeWidth="2"
        />
        
        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 12}
          textAnchor="middle"
          className="fill-white text-base font-semibold"
        >
          Total Value
        </text>
        <text
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          className="fill-emerald-400 text-xl font-bold"
        >
          {currencySymbol}{totalValue.toLocaleString()}
        </text>
      </svg>
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-gray-700 text-white p-3 rounded-lg shadow-lg border border-gray-600 z-10 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.transform
          }}
        >
          <div className="text-sm font-semibold">{tooltip.data.symbol}</div>
          <div className="text-xs text-gray-300">{tooltip.data.name}</div>
          <div className="text-sm">Value: {currencySymbol}{tooltip.data.value.toLocaleString()}</div>
          <div className="text-sm">Shares: {tooltip.data.shares}</div>
          <div className={`text-sm ${tooltip.data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {tooltip.data.change >= 0 ? '+' : ''}{currencySymbol}{tooltip.data.change.toFixed(2)} ({tooltip.data.changePercent >= 0 ? '+' : ''}{tooltip.data.changePercent.toFixed(2)}%)
          </div>
          <div className="text-xs text-gray-400">
            {((tooltip.data.value / totalValue) * 100).toFixed(1)}% of portfolio
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        {data.map((stock) => (
          <div
            key={stock.symbol}
            className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
              hoveredStock === stock.symbol ? 'bg-gray-700' : 'hover:bg-gray-750'
            }`}
            onMouseEnter={() => onHover(stock.symbol)}
            onMouseLeave={() => onHover(null)}
            onClick={() => handleStockClick(stock)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getStockColor(stock.symbol) }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{stock.symbol} - {stock.name}</div>
              <div className="text-xs text-gray-400">{currencySymbol}{stock.value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
          stockSymbol={selectedStock.symbol}
          stockName={selectedStock.name}
        />
      )}
    </div>
  );
};

export default PortfolioChart;