import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import tailwindConfig from '../../../../tailwind/tailwind.config';
import { DomainModelElementTypeNames } from './domainmodel-tools';

export interface TreeNode {
  name: string;
  children?: TreeNode[];

  tags?: TreeNodeTag[];
  $type?: DomainModelElementTypeNames;
}

export type TreeNodeTag = 'supertype' | 'many';
interface TreeProps {
  data: TreeNode;
}


const D3Tree: React.FC<TreeProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;


    // base height and width on the size tree
    const getChildSize = (child: TreeNode): number => {
      if (!child.children) return 1;
      let amount = child.children.length;

      // fastest way to iterate over an array
      const length = child.children.length;
      for (let i = 0; i < length; i++) {
        amount += getChildSize(child.children[i]);
      }
      return amount;
    };
    const size = getChildSize(data);

    const height = size * 20;
    const width = size * 18;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', '100%').attr('height', '100%')

    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

    svg.call(zoom, d3.zoomIdentity.translate(50, 50));


    const hierarchy = d3.hierarchy(data);
    const treeLayout = d3.tree<TreeNode>().size([height, width]);

    const treeData = treeLayout(hierarchy);
    const g = svg.append('g');

    // zoom to show the whole tree
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / size * 3, height / size * 2).scale(3 / (0.1 * size)));


    const link = g.selectAll('.link')
      .data(treeData.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', d => {
        // connect parent node to child node with a bezier curve (quadratic)
        return `M${d.source.y},${d.source.x}C${d.source.y + 100},${d.source.x} ${d.target.y - 100},${d.target.x} ${d.target.y},${d.target.x}`;
      })
      .style('fill', 'none')
      .style('stroke', 'white')
      .style('stroke-width', '1px')
      .style('stroke-dasharray', function (d) {
        if(d.target.data.tags?.includes('supertype')) return '10,5';
        if(d.source.data.tags?.includes('many')) return '5,5';
        return 'none';
      })
      .style('stroke-opacity', '0.4');

    
    const node = g.selectAll('.node')
      .data(treeData.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node.append('circle')
      .attr('r', 5)
      .style('fill', function (d) {
        switch (d.data.$type) {
          case 'PackageDeclaration':
            return '#8c2626'; // accentRed
          case 'DataType':
            return '#B6F059';
          case 'Entity':
            return '#D568E7'; // accentViolet
          case 'Feature':
            return '#1FCDEB'; // accentBlue
          default:
            return '#26888C';
        }
      });

    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.children ? -6 : 6)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name)
      .attr("transform", d => d.children ? `translate(${d.data.name.length * 5}, -20)` : 'translate(5, 0)')
      .style('font-size', '1em')
      .style('font-weight', function (d) {
        switch (d.data.$type) {
          case 'Domainmodel':
            return 'bold';
          default:
            return 'normal';
        }
      })
      .style('fill', function (d) {
        switch (d.data.$type) {
          case 'PackageDeclaration':
            return '#26888C';
          case 'DataType':
            return 'green';
          case 'Entity':
            return '#207578'
          default:
            return '#26888C';
        }
      });



  }, [data]);

  return (
    <svg ref={svgRef} width="100%" height="100%" >
      {/* SVG content will be rendered here */}
    </svg>
  );
};

export default D3Tree;
