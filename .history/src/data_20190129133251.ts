import Vue from 'vue'
import { VueClass } from './declarations'
import { warn } from './util'

/**
 * 通过调用Component的构造函数，计算data应该监听的值。
 * @export
 * @param {Vue} vm                      vue实例
 * @param {VueClass<Vue>} Component     通用生成ComponentOptions的class
 * @returns 
 */
export function collectDataFromConstructor (vm: Vue, Component: VueClass<Vue>) {
  // override _init to prevent to init as Vue instance
  // 将vue的私有构造器_init保存起来。用自定义的构造器，创建一个。这里类似于寄生继承，目的是为解决#209
  const originalInit = Component.prototype._init
  Component.prototype._init = function (this: Vue) {
    // proxy to actual vm
    const keys = Object.getOwnPropertyNames(vm)
    // 2.2.0 compat (props are no longer exposed as self properties)
    if (vm.$options.props) {
      for (const key in vm.$options.props) {
        if (!vm.hasOwnProperty(key)) {
          keys.push(key)
        }
      }
    }
    keys.forEach(key => {
      // vue中data里面的“_”开头的属性会被忽略
      if (key.charAt(0) !== '_') {
        // 里面自定义get和set代替原始的get和set，则不会泄漏。
        Object.defineProperty(this, key, {
          get: () => vm[key],
          set: value => { vm[key] = value },
          configurable: true
        })
      }
    })
  }

  // should be acquired class property values
  // 创建一个真正的Component对象，注意此时_init已经被换掉
  const data = new Component()

  // restore original _init to avoid memory leak (#209)
  // new结束后，再将原始的originalInit返回
  Component.prototype._init = originalInit

  // create plain data object
  // 根据Component对象，创建一个普通对象，并返回作为真正Component的data
  const plainData = {}
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      plainData[key] = data[key]
    }
  })

  if (process.env.NODE_ENV !== 'production') {
    if (!(Component.prototype instanceof Vue) && Object.keys(plainData).length > 0) {
      warn(
        'Component class must inherit Vue or its descendant class ' +
        'when class property is used.'
      )
    }
  }

  return plainData
}
