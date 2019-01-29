import Vue, { ComponentOptions } from 'vue'
import { VueClass, DecoratedClass } from './declarations'

export const noop = () => {}

const fakeArray = { __proto__: [] }
export const hasProto = fakeArray instanceof Array

// createDecorator的返回值，是一个装饰器的重载函数。将es7的类、属性、函数参数等装饰器重载在一起
export interface VueDecorator {
  // Class decorator
  // 类装饰器
  (Ctor: typeof Vue): void

  // Property decorator
  // 属性装饰器
  (target: Vue, key: string): void

  // Parameter decorator
  // 函数参数装饰器
  (target: Vue, key: string, index: number): void
}

export function createDecorator (factory: (options: ComponentOptions<Vue>, key: string, index: number) => void): VueDecorator {
  return (target: Vue | typeof Vue, key?: any, index?: any) => {
    const Ctor = typeof target === 'function'
      ? target as DecoratedClass
      : target.constructor as DecoratedClass
    if (!Ctor.__decorators__) {
      Ctor.__decorators__ = []
    }
    if (typeof index !== 'number') {
      index = undefined
    }
    // 核心是在构造函数里面加__decorators__属性
    Ctor.__decorators__.push(options => factory(options, key, index))
  }
}

// 重载多种合并参数，这样重载是为了提示方便方便？？？
// mixins底层使用Vue.extend实现
export function mixins <A> (CtorA: VueClass<A>): VueClass<A>
export function mixins <A, B> (CtorA: VueClass<A>, CtorB: VueClass<B>): VueClass<A & B>
export function mixins <A, B, C> (CtorA: VueClass<A>, CtorB: VueClass<B>, CtorC: VueClass<C>): VueClass<A & B & C>
export function mixins <A, B, C, D> (CtorA: VueClass<A>, CtorB: VueClass<B>, CtorC: VueClass<C>, CtorD: VueClass<D>): VueClass<A & B & C & D>
export function mixins <A, B, C, D, E> (CtorA: VueClass<A>, CtorB: VueClass<B>, CtorC: VueClass<C>, CtorD: VueClass<D>, CtorE: VueClass<E>): VueClass<A & B & C & D & E>
export function mixins <T> (...Ctors: VueClass<Vue>[]): VueClass<T>
export function mixins (...Ctors: VueClass<Vue>[]): VueClass<Vue> {
  return Vue.extend({ mixins: Ctors })
}

// 不是oject和function就是基本数据类型
export function isPrimitive (value: any): boolean {
  const type = typeof value
  return value == null || (type !== 'object' && type !== 'function')
}

export function warn (message: string): void {
  if (typeof console !== 'undefined') {
    console.warn('[vue-class-component] ' + message)
  }
}
