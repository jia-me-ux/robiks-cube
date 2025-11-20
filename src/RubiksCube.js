import * as THREE from 'three';

export class RubiksCube {
    constructor(scene) {
        this.scene = scene;
        this.cubies = [];
        this.isAnimating = false;
        this.moveHistory = []; // Stack to store moves: { axis, index, direction }
        this.animationQueue = [];
        this.animationSpeed = 500; // ms

        // Standard Colors
        this.colors = {
            U: 0xFFFF00, // Up - Yellow
            D: 0xFFFFFF, // Down - White
            F: 0xFF0000, // Front - Red
            B: 0xFFA500, // Back - Orange
            L: 0x0000FF, // Left - Blue
            R: 0x008000  // Right - Green
        };

        this.createCube();
    }

    createCube() {
        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);

        // Helper to create materials for a cubie based on its position
        const getMaterials = (x, y, z) => {
            const materials = [
                new THREE.MeshPhongMaterial({ color: x === 1 ? this.colors.R : 0x222222 }), // Right
                new THREE.MeshPhongMaterial({ color: x === -1 ? this.colors.L : 0x222222 }), // Left
                new THREE.MeshPhongMaterial({ color: y === 1 ? this.colors.U : 0x222222 }), // Top
                new THREE.MeshPhongMaterial({ color: y === -1 ? this.colors.D : 0x222222 }), // Bottom
                new THREE.MeshPhongMaterial({ color: z === 1 ? this.colors.F : 0x222222 }), // Front
                new THREE.MeshPhongMaterial({ color: z === -1 ? this.colors.B : 0x222222 })  // Back
            ];
            return materials;
        };

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const materials = getMaterials(x, y, z);
                    const cubie = new THREE.Mesh(geometry, materials);
                    cubie.position.set(x, y, z);

                    // Store logical position for rotation logic
                    cubie.userData = {
                        initialPosition: new THREE.Vector3(x, y, z),
                        currentPosition: new THREE.Vector3(x, y, z)
                    };

                    this.scene.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
    }

    // Rotate a layer
    // axis: 'x', 'y', 'z'
    // index: -1, 0, 1 (layer index)
    // direction: 1 (clockwise), -1 (counter-clockwise)
    // animate: boolean
    rotateLayer(axis, index, direction, animate = true, recordMove = true) {
        if (this.isAnimating && animate) return;

        const targetCubies = this.cubies.filter(c => Math.round(c.position[axis]) === index);

        if (animate) {
            this.animateRotation(targetCubies, axis, direction, () => {
                this.finalizeRotation(targetCubies, axis, direction);
                if (recordMove) {
                    this.moveHistory.push({ axis, index, direction });
                }
            });
        } else {
            this.finalizeRotation(targetCubies, axis, direction);
            if (recordMove) {
                this.moveHistory.push({ axis, index, direction });
            }
        }
    }

    animateRotation(cubies, axis, direction, onComplete) {
        this.isAnimating = true;
        const startTime = Date.now();
        const duration = this.animationSpeed;
        const startAngle = 0;
        const targetAngle = (Math.PI / 2) * direction * -1; // Three.js rotation direction is opposite to standard logic sometimes, need to verify

        // Create a temporary pivot group
        const pivot = new THREE.Group();
        pivot.rotation.set(0, 0, 0);
        this.scene.add(pivot);

        // Attach cubies to pivot
        cubies.forEach(c => {
            this.scene.attach(c); // Detach from scene
            pivot.attach(c);      // Attach to pivot, maintaining world transform
        });

        const animateStep = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            pivot.rotation[axis] = targetAngle * ease;

            if (progress < 1) {
                requestAnimationFrame(animateStep);
            } else {
                pivot.rotation[axis] = targetAngle;
                pivot.updateMatrixWorld();

                // Detach from pivot and reattach to scene
                // We need to copy the world transform back to the cubie
                const children = [...pivot.children];
                children.forEach(c => {
                    this.scene.attach(c);
                });

                this.scene.remove(pivot);
                this.isAnimating = false;
                if (onComplete) onComplete();

                // Process next animation if any
                this.processQueue();
            }
        };
        animateStep();
    }

    finalizeRotation(cubies, axis, direction) {
        // Snap positions to grid
        cubies.forEach(c => {
            c.position.x = Math.round(c.position.x);
            c.position.y = Math.round(c.position.y);
            c.position.z = Math.round(c.position.z);
            c.rotation.x = Math.round(c.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
            c.rotation.y = Math.round(c.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
            c.rotation.z = Math.round(c.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
            c.updateMatrix();
        });
    }

    shuffle() {
        if (this.isAnimating) return;
        const moves = 20;
        const axes = ['x', 'y', 'z'];
        const indices = [-1, 0, 1];
        const directions = [1, -1];

        for (let i = 0; i < moves; i++) {
            const axis = axes[Math.floor(Math.random() * axes.length)];
            const index = indices[Math.floor(Math.random() * indices.length)];
            const direction = directions[Math.floor(Math.random() * directions.length)];

            this.queueMove(axis, index, direction);
        }
    }

    solve() {
        if (this.isAnimating) return;
        // Reverse moves
        const history = [...this.moveHistory];
        this.moveHistory = []; // Clear history as we are undoing it (or should we keep it? Requirement says "reverse shuffle")
        // Actually, if we solve, we are effectively clearing the "scramble" state. 

        // We need to reverse the order AND the direction
        for (let i = history.length - 1; i >= 0; i--) {
            const move = history[i];
            this.queueMove(move.axis, move.index, move.direction * -1, false); // false = don't record this undo as a new move
        }
    }

    reset() {
        // Instant reset
        this.cubies.forEach(c => {
            this.scene.remove(c);
            c.geometry.dispose();
            c.material.forEach(m => m.dispose());
        });
        this.cubies = [];
        this.moveHistory = [];
        this.animationQueue = [];
        this.isAnimating = false;
        this.createCube();
    }

    queueMove(axis, index, direction, recordMove = true) {
        this.animationQueue.push({ axis, index, direction, recordMove });
        this.processQueue();
    }

    processQueue() {
        if (this.isAnimating || this.animationQueue.length === 0) return;

        const move = this.animationQueue.shift();
        this.rotateLayer(move.axis, move.index, move.direction, true, move.recordMove);
    }

    update() {
        // Optional: Add per-frame logic if needed
    }
}
