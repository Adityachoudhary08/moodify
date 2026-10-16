import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import '../styles/music-world.scss'

function MusicWorld() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.z = 7

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)

    const world = new THREE.Group()
    scene.add(world)

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: 0x202c28, roughness: 0.45, metalness: 0.2 })
    )
    disc.rotation.x = Math.PI / 2
    world.add(disc)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.035, 10, 64),
      new THREE.MeshStandardMaterial({ color: 0xc49a5c, roughness: 0.35, metalness: 0.55 })
    )
    ring.position.z = 0.12
    world.add(ring)

    const label = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 40),
      new THREE.MeshStandardMaterial({ color: 0xb9553d, roughness: 0.6 })
    )
    label.position.z = 0.13
    world.add(label)

    const bars = []
    for (let index = 0; index < 7; index += 1) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.5 + (index % 3) * 0.18, 0.12),
        new THREE.MeshStandardMaterial({ color: index % 2 ? 0xc49a5c : 0xb9553d, roughness: 0.5 })
      )
      bar.position.set(-2.5 + index * 0.83, -2.15, 0)
      world.add(bar)
      bars.push(bar)
    }

    scene.add(new THREE.AmbientLight(0xf6f3eb, 1.8))
    const keyLight = new THREE.DirectionalLight(0xffd49a, 2.2)
    keyLight.position.set(3, 4, 5)
    scene.add(keyLight)

    const pointer = { x: 0, y: 0 }
    const handlePointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', handlePointerMove)

    const resize = () => {
      const width = canvas.clientWidth || 560
      const height = canvas.clientHeight || 340
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frameId
    const animate = (time) => {
      if (!reducedMotion) {
        disc.rotation.z = time * 0.00025
        ring.rotation.z = -time * 0.0002
        world.rotation.y += (pointer.x * 0.16 - world.rotation.y) * 0.035
        world.rotation.x += (-pointer.y * 0.1 - world.rotation.x) * 0.035
        bars.forEach((bar, index) => {
          bar.scale.y = 0.8 + Math.sin(time * 0.002 + index) * 0.25
        })
      }
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      scene.traverse((object) => {
        if (!object.isMesh) return
        object.geometry.dispose()
        object.material.dispose()
      })
    }
  }, [])

  return (
    <div className="music-world" aria-hidden="true">
      <canvas ref={canvasRef} />
      <span className="world-caption">MOODIFY / RHYTHM FIELD</span>
    </div>
  )
}

export default MusicWorld
