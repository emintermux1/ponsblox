import { useEffect, useRef } from 'react'
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loopWhileVisible } from './raf.ts'

type Props = {
  src: string
  light: [number, number, number]
  spin?: number
  /** Fraction of the shorter view axis the model may occupy. */
  fit?: number
}

function viewFit(camera: PerspectiveCamera, maxDim: number, fill: number) {
  const dist = camera.position.length()
  const vFov = (camera.fov * Math.PI) / 180
  const viewH = 2 * Math.tan(vFov / 2) * dist
  const viewW = viewH * camera.aspect
  return (Math.min(viewW, viewH) * fill) / maxDim
}

export function ModelStage({ src, light, spin = 0.08, fit = 0.58 }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const dir = useRef(light)
  dir.current = light

  useEffect(() => {
    const stage = host.current
    if (!stage) return
    const el = stage

    const scene = new Scene()
    scene.background = new Color(0x000000)
    const camera = new PerspectiveCamera(28, 1, 0.1, 40)
    camera.position.set(0, 0.04, 3.4)
    camera.lookAt(0, 0, 0)

    const renderer = new WebGLRenderer({ antialias: true, alpha: false })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setClearColor(0x000000, 1)
    el.appendChild(renderer.domElement)

    const ambient = new AmbientLight(0xffffff, 0.06)
    const key = new DirectionalLight(0xfff4e6, 2.15)
    scene.add(ambient, key)

    const root = new Group()
    scene.add(root)

    const hold = new Group()
    root.add(hold)
    let maxDim = 1

    const loader = new GLTFLoader()
    let gone = false
    loader.load(src, (gltf) => {
      if (gone) return
      const model = gltf.scene
      const box = new Box3().setFromObject(model)
      const center = box.getCenter(new Vector3())
      const dim = box.getSize(new Vector3())
      maxDim = Math.max(dim.x, dim.y, dim.z) || 1
      model.position.sub(center)
      hold.add(model)
      hold.scale.setScalar(viewFit(camera, maxDim, fit))
    })

    const drag = { on: false, x: 0, y: 0, lx: 0, ly: 0 }
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
      const w = el.clientWidth || 640
      const h = el.clientHeight || 420
      if (now - resizeAt > 240) {
        resizeAt = now
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
        renderer.setSize(w, h, false)
        camera.aspect = w / Math.max(1, h)
        camera.updateProjectionMatrix()
        if (hold.children.length) hold.scale.setScalar(viewFit(camera, maxDim, fit))
      }
      const [lx, ly, lz] = dir.current
      key.position.set(lx * 6, ly * 6, lz * 6)
      if (!drag.on) drag.x += spin * 0.016
      root.rotation.y = drag.x
      root.rotation.x = Math.max(-0.45, Math.min(0.45, drag.y))
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
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [src, spin, fit])

  return <div className="model-stage" ref={host} />
}
