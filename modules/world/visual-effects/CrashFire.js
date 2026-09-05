import * as THREE from 'three';

const vertexShader = `
  uniform float time;
  uniform float kind;
  uniform vec3 up;
  uniform vec3 right;
  uniform vec3 wind;
  attribute vec3 origin;
  attribute vec3 velocity;
  attribute vec4 timing;
  varying vec2 vUv;
  varying float seed;
  varying float life;
  varying float opacity;

  void main() {
    vUv = uv;
    seed = timing.w;
    float elapsed = time + timing.x;
    float age = mod(max(0.0, elapsed), timing.y);
    life = age / timing.y;
    float size = timing.z;
    float fade = sin(3.14159265 * life);
    vec3 offset = origin + velocity * age + wind * age * age * 0.2;
    offset += right * sin(age * 4.0 + seed) * life * 0.18;
    vec2 dimensions;
    if (kind < 0.5) {
      float height = size * (1.9 + sin(time * 11.0 + seed) * 0.25) * min(1.0, 0.3 + time * 3.0);
      dimensions = vec2(size * (1.0 - life * 0.5), height);
      offset += up * height * 0.42;
      opacity = fade * 0.8;
    } else if (kind < 1.5) {
      dimensions = vec2(size * (1.0 + life * 2.8));
      offset += up * 0.65;
      opacity = fade * 0.48 * min(1.0, time * 1.5);
    } else {
      dimensions = vec2(size, size * (1.7 + life));
      offset -= up * 0.45 * age * age;
      opacity = min(1.0, age * 15.0) * (1.0 - life);
    }
    if (elapsed < 0.0) {
      dimensions = vec2(0.0);
      opacity = 0.0;
    }
    vec4 center = modelViewMatrix * vec4(offset, 1.0);
    center.xy += position.xy * dimensions;
    gl_Position = projectionMatrix * center;
  }
`;

const fragmentShader = `
  uniform float time;
  varying float seed;
  varying float life;
  varying float opacity;
  uniform float kind;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }

  float turbulence(vec2 p) {
    return noise(p) * 0.67 + noise(p * 2.07) * 0.33;
  }

  void main() {
    vec2 uv = vUv;
    vec3 color;
    float alpha;
    if (kind > 1.5) {
      float radius = length((uv - 0.5) * 2.0);
      alpha = (1.0 - smoothstep(0.15, 1.0, radius)) * opacity;
      color = mix(vec3(1.0, 0.65, 0.15), vec3(0.8, 0.055, 0.005), life);
    } else if (kind > 0.5) {
      vec2 p = (uv - 0.5) * 2.0;
      float density = turbulence(uv * 5.0 + vec2(seed, -time * 0.24));
      float radius = length(p) + (density - 0.5) * 0.35;
      alpha = (1.0 - smoothstep(0.35, 1.0, radius)) * (0.4 + density * 0.6) * opacity;
      color = mix(vec3(0.045, 0.038, 0.033), vec3(0.22, 0.21, 0.20), density * 0.65 + life * 0.35);
      color += vec3(0.18, 0.045, 0.005) * pow(1.0 - life, 3.0) * (1.0 - uv.y);
    } else {
      float flow = turbulence(vec2(uv.x * 3.5 + seed, uv.y * 4.5 - time * 3.2));
      float curl = noise(vec2(uv.y * 4.0 - time * 2.0, seed)) - 0.5;
      float x = (uv.x - 0.5) * 2.0 + curl * uv.y * 0.65;
      float width = mix(0.85, 0.06, pow(uv.y, 0.8));
      float heat = 1.0 - abs(x) / width - uv.y * 0.38 + (flow - 0.5) * 1.35;
      alpha = smoothstep(0.0, 0.3, heat) * smoothstep(0.0, 0.13, uv.y);
      alpha *= (1.0 - smoothstep(0.72, 1.0, uv.y)) * opacity;
      color = mix(vec3(0.8, 0.035, 0.002), vec3(1.0, 0.32, 0.008), smoothstep(0.05, 0.5, heat));
      color = mix(color, vec3(1.0, 0.84, 0.32), smoothstep(0.5, 0.95, heat) * (1.0 - uv.y));
    }
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class CrashFire extends THREE.Group {
  constructor(car, basis, { mobile = false } = {}) {
    super();
    this.name = 'CrashFire';
    this.time = { value: 0 };
    this.up = basis.upVector();
    this.right = basis.rightVector();
    this.forward = basis.forwardVector();
    this.wind = this.right.clone().multiplyScalar(0.32).addScaledVector(this.forward, -0.16);
    this.position.copy(car.mesh.position).add(this.up);
    this.emitter = new THREE.Vector3(0, 0.65, car.length * 0.32).applyQuaternion(car.mesh.quaternion).sub(this.up);
    this.batches = [];
    const counts = mobile ? [5, 6, 10] : [8, 10, 18];
    const quad = new THREE.PlaneGeometry(1, 1);
    for (let kind = 0; kind < counts.length; kind++) {
      const count = counts[kind];
      const origins = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const timings = new Float32Array(count * 4);
      const origin = new THREE.Vector3();
      const velocity = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const lifetime = kind === 0 ? 0.5 + Math.random() * 0.65 : kind === 1 ? 2.4 + Math.random() * 1.4 : 0.7 + Math.random() * 1.3;
        const size = kind === 0 ? 0.65 + Math.random() * 0.6 : kind === 1 ? 0.8 + Math.random() * 0.5 : 0.025 + Math.random() * 0.035;
        origin.set((Math.random() - 0.5) * car.width * 0.7, 0, (Math.random() - 0.5) * car.length * 0.24);
        origin.applyQuaternion(car.mesh.quaternion).add(this.emitter).toArray(origins, i * 3);
        velocity.copy(this.wind).multiplyScalar(kind === 2 ? 2 : 1);
        velocity.addScaledVector(this.up, kind === 0 ? 0.6 : kind === 1 ? 1.1 + Math.random() * 0.5 : 1.8 + Math.random() * 2.2);
        if (kind === 2) {
          velocity.addScaledVector(this.right, (Math.random() - 0.5) * 1.8);
          velocity.addScaledVector(this.forward, (Math.random() - 0.5) * 1.8);
        }
        velocity.toArray(velocities, i * 3);
        timings.set([kind === 0 ? Math.random() * lifetime : -i * 0.08, lifetime, size, Math.random() * 100], i * 4);
      }
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.setIndex(quad.index.clone());
      geometry.setAttribute('position', quad.attributes.position.clone());
      geometry.setAttribute('uv', quad.attributes.uv.clone());
      geometry.setAttribute('origin', new THREE.InstancedBufferAttribute(origins, 3));
      geometry.setAttribute('velocity', new THREE.InstancedBufferAttribute(velocities, 3));
      geometry.setAttribute('timing', new THREE.InstancedBufferAttribute(timings, 4));
      geometry.instanceCount = count;
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          time: this.time,
          kind: { value: kind },
          up: { value: this.up },
          right: { value: this.right },
          wind: { value: this.wind },
        },
        transparent: true,
        depthWrite: false,
        blending: kind === 2 ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: kind === 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      this.batches.push(mesh);
      this.add(mesh);
    }
    quad.dispose();
    this.light = new THREE.PointLight(0xff7b24, 0, 11, 2);
    this.light.position.copy(this.emitter).addScaledVector(this.up, 0.8);
    this.add(this.light);
    this.update(0);
  }

  update(dt) {
    this.time.value += dt;
    const time = this.time.value;
    const ignition = Math.min(1, 0.3 + time * 3);
    this.light.intensity = ignition * (30 + Math.sin(time * 19) * 5 + Math.sin(time * 31 + 1) * 3) + 55 * Math.exp(-time * 12);
  }

  dispose() {
    this.removeFromParent();
    for (const mesh of this.batches) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.light.dispose();
    this.batches.length = 0;
    this.clear();
  }
}
