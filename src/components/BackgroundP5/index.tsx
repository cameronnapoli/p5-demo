/* eslint-disable @next/next/no-sync-scripts */
import _ from 'lodash';
import p5 from 'p5';
import React, { useEffect, useRef } from 'react';

import styles from './styles.module.scss';

import { useIsVisible, useMouseStagnant } from '@/lib/hooks';
import { clamp } from '@/lib/utils';

const settings = {
  fps: 60,
  dotColor: '#bab6ab',
  dotSize: 4,
  maxGravForce: 12,
  maxEllasticForce: 20,
  columns: 80,
  columnGap: 10,
  rows: 40,
  rowGap: 10,
};

let pauseFn: () => void = () => undefined;
let resumeFn: () => void = () => undefined;

const sketch = (p: p5) => {
  p.disableFriendlyErrors = true;

  /**
   * force = G*m1*m2 / (distance * distance)
   */
  const calculateGravity = (point1: p5.Vector, point2: p5.Vector) => {
    const G = 1000; // grav constant
    const m1 = 1;
    const m2 = 1;

    // calculate distance
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // calculate force magnitude
    const forceMagnitude = G * m1 * m2 / Math.pow(distance, 1.05);

    // calculate force direction (unit vector)
    const ux = dx / distance;
    const uy = dy / distance;

    // calculate vector components
    const fx = clamp(forceMagnitude * ux, -settings.maxGravForce, settings.maxGravForce);
    const fy = clamp(forceMagnitude * uy, -settings.maxGravForce, settings.maxGravForce);

    // create and return the force vector
    return p.createVector(fx, fy);
  };

  const calculateElasticity = (point1: p5.Vector, point2: p5.Vector) => {
    // calculate distance
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // calculate force magnitude
    let forceMagnitude = 0;
    if (distance <= 2.62) { // 2.62 is where these two functions intersect
      // y = x
      forceMagnitude = Math.abs(distance);
    } else {
      // exponential
      forceMagnitude = (Math.pow(1.7, (0.5 * distance) - 2)) + 2;
    }

    // calculate force direction (unit vector)
    const ux = distance !== 0 ? (dx / distance) : 0;
    const uy = distance !== 0 ? (dy / distance) : 0;

    // calculate vector components
    const fx = clamp(forceMagnitude * ux, -settings.maxEllasticForce, settings.maxEllasticForce);
    const fy = clamp(forceMagnitude * uy, -settings.maxEllasticForce, settings.maxEllasticForce);

    // create and return the force vector
    return p.createVector(fx, fy);
  };

  class Entity {
    position: p5.Vector;
    velocity: p5.Vector;
    anchor: p5.Vector;
    debug: boolean;

    constructor(position: p5.Vector, debug: boolean) {
      this.position = p.createVector(position.x, position.y);
      this.velocity = p.createVector(0, 0);
      this.anchor = p.createVector(position.x, position.y);
      this.debug = debug || false;
    }

    getPosition() {
      return this.position;
    }

    getAnchor() {
      return this.anchor;
    }

    applyForce(force: p5.Vector) {
      this.velocity.add(force);
    }

    applyAnchorDamping() {
      // the closer we are to the anchor, the more we reduce the speed
      const point1 = this.position;
      const point2 = this.anchor;

      // Define a minimum distance to avoid extreme damping close to the anchor
      const minDistance = 8; // You can adjust this value
      const safeDistance = Math.max(point1.dist(point2), minDistance);

      // Define the damping strength
      const dampingStrength = 0.95; // You can adjust this value (closer to 1 means less damping)

      // Calculate the damping factor
      // As the entity gets closer to the anchor, the damping factor decreases
      const dampingFactor = Math.pow(dampingStrength, safeDistance);

      //     if (this.debug) {
      //       console.log('anchor damping', point1.dist(point2).toFixed(2), dampingFactor)
      //     }

      // Apply damping to velocity
      this.velocity.mult(dampingFactor);
    }

    applyMouseDamping(mousePoint: p5.Vector) {
      const point1 = this.position;
      const point2 = mousePoint;

      const distance = point1.dist(point2);

      if (distance > 30) {
        return;
      }

      const dampingFactor = clamp(0.05 * distance + 0.0, 0, 1);

      // if (this.debug) {
      //   console.log('mouse damping', point1.dist(point2).toFixed(2), dampingFactor)
      // }

      this.velocity.mult(dampingFactor);
    }

    applyVelocity() {
      this.position.add(this.velocity);
    }

    show() {
      p.ellipse(this.position.x, this.position.y, settings.dotSize, settings.dotSize, 8);
    }
  }

  let entities: Entity[] = [];
  function createEntities() {
    entities = [];

    const gridWidth = (settings.columns * settings.dotSize) + ((settings.columns - 1) * settings.columnGap);
    const gridHeight = (settings.rows * settings.dotSize) + ((settings.rows - 1) * settings.rowGap);

    for (let i = 0; i < settings.columns; i++) {
      for (let j = 0; j < settings.rows; j++) {
        let x = i * (settings.dotSize + settings.columnGap);
        let y = j * (settings.dotSize + settings.rowGap);

        // normalize to center
        // x = x + (p.windowWidth / 2) - (gridWidth / 2);
        // y = y + (p.windowHeight / 2) - (gridHeight / 2);
        x = x - (gridWidth / 2);
        y = y - (gridHeight / 2);

        entities.push(
          new Entity(
            p.createVector(x, y),
            i === 0 && j === 0,
          ),
        );
      }
    }
  }
  const createEntitiesThrottled = _.debounce(createEntities, 250);

  p.setup = () => {
    p.frameRate(settings.fps);
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    createEntities();
    canvas.parent('p5-container');

    pauseFn = () => p.noLoop();
    resumeFn = () => p.loop();

    // p.noLoop();
  };

  p.draw = () => {
    console.log('draw');
    p.clear(0,0,0,0);

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      const mousePosition = (p.mouseX !== 0 && p.mouseY !== 0) ?
        p.createVector(p.mouseX - (p.windowWidth / 2), p.mouseY - (p.windowHeight / 2)) : null;

      if (mousePosition) {
        const mouseForce = calculateGravity(
          entity.getPosition(),
          mousePosition,
        );
        // if (entity.debug) {
        //   console.log(mouseForce.toString())
        // }
        entity.applyForce(mouseForce);
      }

      const anchorForce = calculateElasticity(
        entity.getPosition(),
        entity.getAnchor(),
      );
      entity.applyForce(anchorForce);

      entity.applyAnchorDamping();

      if (mousePosition) {
        entity.applyMouseDamping(mousePosition);
      }

      entity.applyVelocity();

      p.noStroke();
      p.fill(settings.dotColor);
      entity.show();
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    createEntitiesThrottled();
  };
};

const BackgroundP5: React.FunctionComponent = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(rootRef, { threshold: 0.1 });
  const isStagnant = useMouseStagnant(1000);
  const isPaused = !isVisible || isStagnant;

  const created = useRef(false);
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    new p5(sketch);
  }, []);

  useEffect(() => {
    if (isPaused) {
      pauseFn();
    } else {
      resumeFn();
    }
  }, [isPaused]);

  return (
    <div className={styles.root} ref={rootRef}>
      <div id="p5-container" />
    </div>
  );
};

export default BackgroundP5;
