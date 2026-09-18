import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CUSTOM_DEFAULT, type CustomSkin } from '../lib/custom.ts'
import { curvePoints } from '../lib/curve.ts'
import { kitById, type KitId } from '../lib/kits.ts'
import { loopWhileVisible } from '../lib/raf.ts'

export function Field(props: { kit: KitId; custom?: CustomSkin }) {
  const host = useRef<HTMLDivElement>(null)
  const kitRef = useRef(props.kit)
  const customRef = useRef(props.custom)
  kitRef.current = props.kit
  customRef.current = props.custom

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x070707, 1.6, 5.2)
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20)
    camera.position.set(0, 0.55, 2.6)

    const group = new THREE.Group()
    scene.add(group)
    const light = new THREE.PointLight(0xffffff, 18, 8, 1.6)
    light.position.set(0.4, 1.1, 1.2)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0xffffff, 0.18))

    const geo = new THREE.SphereGeometry(0.018, 8, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc8ff3d,
      roughness: 0.35,
      metalness: 0.2,
      emissive: 0x223300,
      emissiveIntensity: 0.6,
    })
    const count = 420
    const mesh = new THREE.InstancedMesh(geo, mat, count)
    group.add(mesh)
    const dummy = new THREE.Object3D()
    const pts0 = curvePoints(0, 80, 36)
    const pts1 = curvePoints(1, 80, 36)
    const pts2 = curvePoints(2, 80, 36)
    const ribbons = [pts0, pts1, pts2]

    const applyColor = () => {
      const kit = kitById(kitRef.current)
      const skin = kitRef.current === 'custom' ? { ...CUSTOM_DEFAULT, ...customRef.current } : kit
      mat.color = new THREE.Color(skin.accent)
      mat.emissive = new THREE.Color(skin.accent)
      light.color = new THREE.Color(skin.accent)
    }
    applyColor()

    const pointer = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    }
    el.addEventListener('pointermove', onMove)

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const stop = loopWhileVisible(el, (t) => {
      applyColor()
      const time = t * 0.001
      let i = 0
      for (let r = 0; r < ribbons.length; r += 1) {
        const ribbon = ribbons[r]
        const minY = ribbon[0].y
        const maxY = ribbon[ribbon.length - 1].y
        const span = maxY - minY || 1
        for (let p = 0; p < ribbon.length; p += 1) {
          if (i >= count) break
          const pt = ribbon[p]
          const ny = (pt.y - minY) / span
          const wave = Math.sin(time * 1.6 + p * 0.18 + r) * 0.08
          dummy.position.set(
            (pt.x / 36) * 2.4 - 1.2,
            ny * 0.95 + wave - 0.2 + r * 0.16,
            (r - 1) * 0.42 + Math.cos(time + p * 0.05) * 0.06,
          )
          const s = 0.7 + ((p + r) % 5) * 0.12
          dummy.scale.setScalar(s)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
          i += 1
        }
      }
      while (i < count) {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        i += 1
      }
      mesh.instanceMatrix.needsUpdate = true
      if (!reduce) {
        group.rotation.y = pointer.x * 0.35 + Math.sin(time * 0.35) * 0.18
        group.rotation.x = pointer.y * 0.12 + 0.18
        light.position.x = pointer.x * 1.4
        light.position.y = 1 + pointer.y * 0.5
      }
      renderer.render(scene, camera)
    })

    return () => {
      stop()
      ro.disconnect()
      el.removeEventListener('pointermove', onMove)
      geo.dispose()
      mat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="field" ref={host} aria-hidden />
}
