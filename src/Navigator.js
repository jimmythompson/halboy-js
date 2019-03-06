import URI from 'urijs'
import Resource from './Resource'
import { resolveLink } from './params'
import axiosOptions from './axiosOptions'

const makeAbsolute = (baseUri, relativeUri) =>
  URI(relativeUri).absoluteTo(baseUri).toString()

class Navigator {
  static defaultOptions = {
    ...axiosOptions,
    followRedirects: true
  }

  static discover (url, options = {}) {
    return new Navigator(options)
      .getUrl(url, {}, options.http)
  }

  static resume (location, resource, options = {}) {
    return new Navigator(options)
      ._setLocation(location)
      ._setResource(resource)
  }

  _setResource (resource) {
    this._resource = resource
    return this
  }

  _setLocation (location) {
    this._location = location
    return this
  }

  constructor (options) {
    this.options = {
      ...Navigator.defaultOptions,
      ...options
    }
  }

  location () {
    return this._location
  }

  status () {
    return this._status
  }

  resource () {
    return this._resource
  }

  getHeader (key) {
    return this._response.headers[key]
  }

  resolveLink (rel, params) {
    const relativeHref = this._resource.getHref(rel)

    if (!relativeHref) {
      throw new Error(`Attempting to follow the link '${rel}', which does not exist`)
    }

    const { href, params: queryParams } = resolveLink(relativeHref, params)

    return {
      href: makeAbsolute(this._location, href),
      queryParams
    }
  }

  async get (rel, params = {}, config = {}) {
    const { href, queryParams } = this.resolveLink(rel, params)
    return this.getUrl(href, queryParams, config)
  }

  async post (rel, body, params = {}, config = {}) {
    const { href } = this.resolveLink(rel, params)
    return this.postUrl(href, body, config)
  }

  async getUrl (url, params, config) {
    const {
      status,
      location,
      body,
      response
    } = await this.options.get(url, params, config)

    this._status = status
    this._location = location
    this._response = response
    this._resource = Resource.fromObject(body)

    return this
  }

  async postUrl (url, body, config) {
    const {
      status,
      location,
      body: responseBody,
      response
    } = await this.options.post(url, body, config)

    this._status = status
    this._location = location
    this._response = response
    this._resource = Resource.fromObject(responseBody)

    if (this.options.followRedirects && status === 201) {
      return this.followRedirect()
    }

    return this
  }

  async followRedirect () {
    return this.getUrl(
      makeAbsolute(this._location, this.getHeader('location')), {})
  }
}

module.exports = Navigator
