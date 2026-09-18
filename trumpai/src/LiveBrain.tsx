import { useEffect, useRef } from 'react'
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loopWhileVisible } from './raf.ts'
import type { SimRuntime } from './sim.ts'

const BRAIN = '/models/brain.glb'
const BRAIN_CDN =
  'https://cdn.jsdelivr.net/gh/hubmapconsortium/ccf-3d-reference-object-library@main/VH_Male/v1.2/Allen_M_Brain.glb'
const CHANNELS = 96

function viewFit(camera: PerspectiveCamera, maxDim: number, fill: number) {
  const dist = camera.position.length()
  const vFov = (camera.fov * Math.PI) / 180
  const viewH = 2 * Math.tan(vFov / 2) * dist
  const viewW = viewH * camera.aspect
  return (Math.min(viewW, viewH) * fill) / maxDim
}

export function LiveBrain({ live }: { live: { current: SimRuntime } }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = host.current
    if (!stage) return
    const el = stage

    const scene = new Scene()
    scene.background = new Color(0x000000)
    const camera = new PerspectiveCamera(28, 1, 0.05, 40)
    camera.position.set(0.1, 0.08, 3.55)
    camera.lookAt(0, 0, 0)

    const renderer = new WebGLRenderer({ antialias: true })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setClearColor(0x000000, 1)
    el.appendChild(renderer.domElement)

    const ambient = new AmbientLight(0xfff4ee, 0.46)
    const key = new DirectionalLight(0xfff1d6, 1.48)
    key.position.set(1.35, 1.55, 2.15)
    const fill = new DirectionalLight(0x8aa4c4, 0.38)
    fill.position.set(-2.1, 0.28, -1.15)
    const speechGlow = new PointLight(0xffd8b0, 0.22, 6)
    const decideGlow = new PointLight(0xd4c48a, 0.2, 6)
    speechGlow.position.set(-0.48, 0.16, 0.52)
    decideGlow.position.set(0.5, 0.14, 0.5)
    scene.add(ambient, key, fill, speechGlow, decideGlow)

    const root = new Group()
    scene.add(root)
    const hold = new Group()
    root.add(hold)

    const skins: MeshStandardMaterial[] = []
    const samples: Vector3[] = []
    const dummy = new Object3D()
    const mat4 = new Matrix4()
    const geo = new SphereGeometry(0.02, 8, 8)
    const mark = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.3,
      roughness: 0.35,
    })
    const field = new InstancedMesh(geo, mark, CHANNELS)
    field.visible = false

    let maxDim = 1
    let gone = false
    const loader = new GLTFLoader()
    function mountBrain(gltf: { scene: Group }) {
      if (gone) return
      el.dataset.brain = 'live'
      const model = gltf.scene
      const box = new Box3().setFromObject(model)
      const center = box.getCenter(new Vector3())
      const dim = box.getSize(new Vector3())
      maxDim = Math.max(dim.x, dim.y, dim.z) || 1
      model.position.sub(center)
      hold.add(model)
      hold.scale.setScalar(viewFit(camera, maxDim, 0.46))
      hold.rotation.y = 0.55
      hold.rotation.x = 0.06
      hold.updateWorldMatrix(true, true)
      model.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        const nexts = mats.map((raw) => {
          const next = raw.clone()
          if (next instanceof MeshStandardMaterial) {
            next.emissive = new Color(0x141414)
            next.emissiveIntensity = 0.16
            skins.push(next)
          }
          return next
        })
        obj.material = Array.isArray(obj.material) ? nexts : nexts[0]
        const pos = obj.geometry.getAttribute('position')
        if (!pos) return
        const step = Math.max(1, Math.floor(pos.count / 220))
        for (let i = 0; i < pos.count; i += step) {
          const v = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
          obj.localToWorld(v)
          if (v.y > -0.08) samples.push(v.clone())
        }
      })
      samples.sort((a, b) => a.x - b.x)
      const picks = samples.slice(0, CHANNELS)
      for (let i = 0; i < CHANNELS; i++) {
        const p = picks[i] ?? new Vector3()
        dummy.position.copy(p)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        field.setMatrixAt(i, dummy.matrix)
      }
      field.instanceMatrix.needsUpdate = true
      field.visible = picks.length > 0
      root.add(field)
    }
    loader.load(BRAIN, mountBrain, undefined, () => {
      loader.load(BRAIN_CDN, mountBrain, undefined, () => {
        el.dataset.brain = 'fail'
      })
    })

    const drag = { on: false, x: 0.08, y: 0.02, lx: 0, ly: 0 }
    function onDown(ev: PointerEvent) {
      drag.on = true
      drag.lx = ev.clientX
      drag.ly = ev.clientY
      el.setPointerCapture(ev.pointerId)
    }
    function onMove(ev: PointerEvent) {
      if (!drag.on) return
      drag.x += (ev.clientX - drag.lx) * 0.005
      drag.y += (ev.clientY - drag.ly) * 0.003
      drag.lx = ev.clientX
      drag.ly = ev.clientY
    }
    function onUp() {
      drag.on = false
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    let resizeAt = -999
    const draw = (now: number) => {
      const rt = live.current
      const w = el.clientWidth || 640
      const h = el.clientHeight || 420
      if (now - resizeAt > 240) {
        resizeAt = now
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55))
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(1, h)
        camera.updateProjectionMatrix()
        if (hold.children.length) hold.scale.setScalar(viewFit(camera, maxDim, 0.46))
      }

      const speak = rt.speech
      const decide = rt.decision
      const attend = rt.attention
      const mem = rt.memory
      const brief = rt.briefing
      const lock = rt.lock
      const cad = rt.cadence

      for (const skin of skins) {
        skin.emissiveIntensity = 0.1 + lock * 0.32 + speak * 0.55 + decide * 0.4 + cad * 0.35
        skin.emissive.setRGB(0.1 + speak * 0.55 + brief * 0.18, 0.09 + decide * 0.22 + mem * 0.1, 0.11 + attend * 0.28)
      }

      speechGlow.intensity = 0.14 + speak * 2.4 + cad * 1.4
      decideGlow.intensity = 0.12 + decide * 2.1 + lock * 0.8
      speechGlow.position.set(-0.48, 0.12 + speak * 0.16, 0.5)
      decideGlow.position.set(0.5, 0.12 + decide * 0.14, 0.5)

      if (field.visible) {
        for (let i = 0; i < CHANNELS; i++) {
          const bin = rt.bins[i % rt.bins.length] ?? 0
          const fire = bin * (0.3 + lock * 0.4 + attend * 0.35) + speak * 0.2 + mem * 0.15
          field.getMatrixAt(i, mat4)
          dummy.position.setFromMatrixPosition(mat4)
          dummy.scale.setScalar(0.4 + fire * 2.35)
          dummy.updateMatrix()
          field.setMatrixAt(i, dummy.matrix)
        }
        field.instanceMatrix.needsUpdate = true
        mark.emissiveIntensity = 0.5 + lock * 0.85 + speak * 1.4 + decide * 1.1
      }

      const punch = 1 + speak * 0.03 + decide * 0.025 + cad * 0.02
      root.scale.set(punch, punch, punch)

      if (!drag.on) {
        drag.x += (0.08 + (decide - 0.4) * 0.12 - drag.x) * 0.03
        drag.y += (0.02 + (speak - 0.3) * 0.06 - drag.y) * 0.03
      }
      root.rotation.y = drag.x
      root.rotation.x = Math.max(-0.32, Math.min(0.32, drag.y))
      renderer.render(scene, camera)
    }

    const stop = loopWhileVisible(el, draw, 16)
    return () => {
      gone = true
      stop()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      geo.dispose()
      mark.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [live])

  return <div className="model-stage" ref={host} />
}
