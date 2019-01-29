import Vue, { ComponentOptions } from 'vue'
import { copyReflectionMetadata, reflectionIsSupported } from './reflect'
import { VueClass, DecoratedClass } from './declarations'
import { collectDataFromConstructor } from './data'
import { hasProto, isPrimitive, warn } from './util'

// vue的声明周期钩子名称
export const $internalHooks = [
  'data',
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeDestroy',
  'destroyed',
  'beforeUpdate',
  'updated',
  'activated',
  'deactivated',
  'render',
  'errorCaptured' // 2.5
]

/**
 * 真正的类装饰器。
 * @export
 * @param {VueClass<Vue>} Component             类
 * @param {ComponentOptions<Vue>} [options={}]  类的Vue配置
 * @returns {VueClass<Vue>} 
 */
export function componentFactory (
  Component: VueClass<Vue>,
  options: ComponentOptions<Vue> = {}
): VueClass<Vue> {
  // 如果未设置控件名称，用Vue的ComponentOptions的私有变量_componentTag做名称，如果也没用使用类名做名称
  options.name = options.name || (Component as any)._componentTag || (Component as any).name
  // prototype props.
  const proto = Component.prototype

  // 通过options扩展构造器的原型
  Object.getOwnPropertyNames(proto).forEach(function (key) {
    if (key === 'constructor') {
      return
    }

    // hooks
    if ($internalHooks.indexOf(key) > -1) {
      // 将原型上的同名的钩子函数替换掉options里面的钩子函数。
      // 从源码上看，class定义的钩子函数会替换掉options里面的钩子函数
      options[key] = proto[key]
      return
    }

    // 这个!是啥意思？这里没用语法错误？？？？
    const descriptor = Object.getOwnPropertyDescriptor(proto, key)!
    if (descriptor.value !== void 0) {

      // class里面定义的方法会自动的导入到options里面的methods里面
      // methods
      if (typeof descriptor.value === 'function') {
        (options.methods || (options.methods = {}))[key] = descriptor.value
      } else {

        // typescript decorated data
        // typescript编译时候，会将装饰器的值保存到原型里面？？？
        (options.mixins || (options.mixins = [])).push({
          data (this: Vue) {
            return { [key]: descriptor.value }
          }
        })
      }
    } else if (descriptor.get || descriptor.set) {
      // 如果是getter和setter，将其放入计算值里面。这里有个请问，计算值的getter应该是一个纯函数，而getter却不一定
      // computed properties
      (options.computed || (options.computed = {}))[key] = {
        get: descriptor.get,
        set: descriptor.set
      }
    }
  })

  // add data hook to collect class properties as Vue instance's data
  ;(options.mixins || (options.mixins = [])).push({
    data (this: Vue) {
      // 使用collectDataFromConstructor生成data
      return collectDataFromConstructor(this, Component)
    }
  })

  // decorate options
  const decorators = (Component as DecoratedClass).__decorators__
  if (decorators) {
    decorators.forEach(fn => fn(options))
    delete (Component as DecoratedClass).__decorators__
  }

  // 获取父类，如果Component不是继承自的Vue，则直接使用Vue。
  // find super
  const superProto = Object.getPrototypeOf(Component.prototype)
  const Super = superProto instanceof Vue
    ? superProto.constructor as VueClass<Vue>
    : Vue
  // 用Super的extend将options编程一个Vue的构造函数返回
  const Extended = Super.extend(options)

  forwardStaticMembers(Extended, Component, Super)

  if (reflectionIsSupported) {
    copyReflectionMetadata(Extended, Component)
  }

  // 返回的对象和Component完全无关。说明此事已经是一个Vue的extend后的子类函数了。
  return Extended
}

// 这是vue的extend后的子类函数拥有的属性
const reservedPropertyNames = [
  // Unique id
  'cid',

  // Super Vue constructor
  'super',

  // Component options that will be used by the component
  'options',
  'superOptions',
  'extendOptions',
  'sealedOptions',

  // Private assets
  'component',
  'directive',
  'filter'
]

/**
 * 用于模拟静态方法。Extended继承自Original（使用的是vue的extend继承，而不是es6的class继承），这里将Original也遗传给Extended
 * @param {typeof Vue} Extended 返回的类，同vue的extend创建继承自Original的类
 * @param {typeof Vue} Original 原始的类函数，是通过es6类继承
 * @param {typeof Vue} Super 超类
 */
function forwardStaticMembers (
  Extended: typeof Vue,
  Original: typeof Vue,
  Super: typeof Vue
): void {
  // We have to use getOwnPropertyNames since Babel registers methods as non-enumerable
  Object.getOwnPropertyNames(Original).forEach(key => {
    // `prototype` should not be overwritten
    if (key === 'prototype') {
      return
    }

    // Some browsers does not allow reconfigure built-in properties
    const extendedDescriptor = Object.getOwnPropertyDescriptor(Extended, key)
    if (extendedDescriptor && !extendedDescriptor.configurable) {
      return
    }

    const descriptor = Object.getOwnPropertyDescriptor(Original, key)!

    // If the user agent does not support `__proto__` or its family (IE <= 10),
    // the sub class properties may be inherited properties from the super class in TypeScript.
    // We need to exclude such properties to prevent to overwrite
    // the component options object which stored on the extended constructor (See #192).
    // If the value is a referenced value (object or function),
    // we can check equality of them and exclude it if they have the same reference.
    // If it is a primitive value, it will be forwarded for safety.
    if (!hasProto) {
      // Only `cid` is explicitly exluded from property forwarding
      // because we cannot detect whether it is a inherited property or not
      // on the no `__proto__` environment even though the property is reserved.
      if (key === 'cid') {
        return
      }

      const superDescriptor = Object.getOwnPropertyDescriptor(Super, key)

      if (
        !isPrimitive(descriptor.value) &&
        superDescriptor &&
        superDescriptor.value === descriptor.value
      ) {
        return
      }
    }

    // Warn if the users manually declare reserved properties
    if (
      process.env.NODE_ENV !== 'production' &&
      reservedPropertyNames.indexOf(key) >= 0
    ) {
      warn(
        `Static property name '${key}' declared on class '${Original.name}' ` +
        'conflicts with reserved property name of Vue internal. ' +
        'It may cause unexpected behavior of the component. Consider renaming the property.'
      )
    }

    Object.defineProperty(Extended, key, descriptor)
  })
}
