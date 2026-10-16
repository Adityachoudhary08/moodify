import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Guy Lying on Floor ─────────────────────────────────────────
function GuyLyingDown({ mousePos }) {
  const group = useRef()

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    // Subtle breathing animation
    group.current.position.y = Math.sin(t * 1.5) * 0.02
    
    // Head looks slightly towards mouse
    if (group.current.children[0]) {
      group.current.children[0].rotation.y = (mousePos.current.x * 0.3)
      group.current.children[0].rotation.z = (mousePos.current.y * 0.3)
    }
  })

  // Theme colors inspired by the image (Dark shirt, blue jeans, dark hair/headphones)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2a786, roughness: 0.6, metalness: 0.1 })
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 })
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3b5998, roughness: 0.9, metalness: 0.1 })
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8, metalness: 0.1 })
  const hpMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4, metalness: 0.6 })
  const hpAccentMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.9 })

  return (
    <group ref={group} position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, -0.15]} scale={1.3} castShadow receiveShadow>
      {/* Head */}
      <group position={[0, 1.2, 0]}>
        <mesh material={skinMat} castShadow>
          <sphereGeometry args={[0.3, 32, 32]} />
        </mesh>
        {/* Hair blocky */}
        <mesh position={[0, 0.1, 0.1]} material={hairMat} castShadow>
          <boxGeometry args={[0.65, 0.6, 0.65]} />
        </mesh>
        
        {/* Headphones */}
        <mesh position={[-0.32, 0, 0]} material={hpMat} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} rotation={[0, 0, Math.PI/2]} />
        </mesh>
        <mesh position={[0.32, 0, 0]} material={hpMat} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} rotation={[0, 0, Math.PI/2]} />
        </mesh>
        <mesh position={[0, 0.32, 0]} material={hpAccentMat} castShadow>
          <torusGeometry args={[0.35, 0.03, 16, 32, Math.PI]} />
        </mesh>
      </group>

      {/* Torso */}
      <mesh position={[0, 0.3, -0.1]} material={shirtMat} castShadow>
        <boxGeometry args={[0.8, 1.2, 0.4]} />
      </mesh>

      {/* Arms (folded) */}
      <mesh position={[-0.45, 0.5, 0]} rotation={[0, 0, -0.4]} material={skinMat} castShadow>
        <capsuleGeometry args={[0.12, 0.6, 16, 16]} />
      </mesh>
      <mesh position={[0.45, 0.5, 0]} rotation={[0, 0, 0.4]} material={skinMat} castShadow>
        <capsuleGeometry args={[0.12, 0.6, 16, 16]} />
      </mesh>
      
      {/* Hands resting on stomach */}
      <mesh position={[0, 0.1, 0.15]} rotation={[0, 0, Math.PI/2]} material={skinMat} castShadow>
        <capsuleGeometry args={[0.1, 0.4, 16, 16]} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.22, -0.8, -0.1]} material={pantsMat} castShadow>
        <boxGeometry args={[0.35, 1.2, 0.35]} />
      </mesh>
      <mesh position={[0.22, -0.8, -0.1]} material={pantsMat} castShadow>
        <boxGeometry args={[0.35, 1.2, 0.35]} />
      </mesh>
    </group>
  )
}

// ─── Scattered Cassettes / Books ─────────────────────────────────────────
function ScatteredItems() {
  const items = useMemo(() => {
    const list = []
    for (let i = 0; i < 20; i++) {
      list.push({
        x: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 6,
        rY: Math.random() * Math.PI,
        color: [0x555555, 0x8a5a44, 0xd4a373, 0x222222, 0x4a4e69][Math.floor(Math.random() * 5)],
        isBook: Math.random() > 0.5
      })
    }
    return list
  }, [])

  return (
    <group>
      {items.map((item, i) => (
        <mesh key={i} position={[item.x, 0.05, item.z]} rotation={[0, item.rY, 0]} castShadow receiveShadow>
          <boxGeometry args={item.isBook ? [0.6, 0.1, 0.8] : [0.3, 0.05, 0.2]} />
          <meshStandardMaterial color={item.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Floor ─────────────────────────────────────────
function Floor() {
  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color={0x8a5a44} roughness={0.9} />
    </mesh>
  )
}

// ─── Main Scene export ──────────────────────────────────────────────────────
export default function HeroScene({ mousePos }) {
  return (
    <>
      {/* Warm Golden Hour Lighting */}
      <ambientLight intensity={0.4} color={0xffe4b5} />
      {/* Main sun light casting shadows */}
      <directionalLight 
        position={[-6, 5, 2]} 
        intensity={3.5} 
        color={0xffaa00} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      {/* Soft fill light */}
      <directionalLight position={[4, 3, -3]} intensity={0.8} color={0xa0c4ff} />

      {/* Ground */}
      <Floor />

      {/* Main hero lying down */}
      <GuyLyingDown mousePos={mousePos} />

      {/* Scattered objects */}
      <ScatteredItems />
    </>
  )
}
