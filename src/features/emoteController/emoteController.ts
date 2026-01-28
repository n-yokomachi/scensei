import * as THREE from 'three'
import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm'
import { ExpressionController } from './expressionController'
import { GestureController, GestureType } from './gestureController'

/**
 * 感情表現としてExpressionとMotionを操作する為のクラス
 */
export class EmoteController {
  private _expressionController: ExpressionController
  private _gestureController: GestureController

  constructor(vrm: VRM, camera: THREE.Object3D) {
    this._expressionController = new ExpressionController(vrm, camera)
    this._gestureController = new GestureController(vrm)
  }

  public playEmotion(preset: VRMExpressionPresetName) {
    this._expressionController.playEmotion(preset)
  }

  public playGesture(gesture: GestureType) {
    this._gestureController.playGesture(gesture)
  }

  public lipSync(preset: VRMExpressionPresetName, value: number) {
    this._expressionController.lipSync(preset, value)
  }

  public update(delta: number) {
    this._expressionController.update(delta)
    this._gestureController.update(delta)
  }

  public updateExpression(delta: number) {
    this._expressionController.update(delta)
  }

  public updateGesture(delta: number) {
    this._gestureController.update(delta)
  }
}
