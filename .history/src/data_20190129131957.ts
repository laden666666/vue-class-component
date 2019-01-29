import Vue from 'vue'
import { VueClass } from './declarations'
import { warn } from './util'

/**
 * 通过调用Component的构造函数，计算data应该监听的值
 * @export
 * @param {Vue} vm 
 * @param {VueClass<Vue>} Component 
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
      // 这里为什么构造构造器？？？
      if (key.charAt(0) !== '_') {
        Object.defineProperty(this, key, {
          get: () => vm[key],
          set: value => { vm[key] = value },
          configurable: true
        })
      }
    })
  }

  // should be acquired class property values
  // 控件的_init被替换了，不会调用原始的vue的_init方法
  const data = new Component()

  // restore original _init to avoid memory leak (#209)
  // new结束后，再将原始的originalInit返回
  Component.prototype._init = originalInit

  // create plain data object
  // 根据计算吃的keys，创建一个data返回
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
